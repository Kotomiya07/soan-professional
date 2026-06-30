import type { GenerationMetadata } from './types.js';

const JPEG_SOI = 0xffd8;
const XMP_NAMESPACE = 'http://ns.adobe.com/xap/1.0/\0';
const MAX_APP1_SEGMENT_LENGTH = 0xffff;

export interface XmpInjectionResult {
  readonly buffer: Buffer;
  readonly embedded: boolean;
  readonly mode?: 'full' | 'compact';
  readonly reason?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmpPacketFromMetadata(metadata: GenerationMetadata): Buffer {
  const json = JSON.stringify(metadata);
  const packet = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" xmlns:soan="https://codh.rois.ac.jp/soan/professional-cli/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" soan:metadata="${escapeXml(json)}" />
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
  return Buffer.from(`${XMP_NAMESPACE}${packet}`, 'utf8');
}

function compactMetadata(metadata: GenerationMetadata): GenerationMetadata {
  return {
    ...metadata,
    xmp: { embedded: true, mode: 'compact' },
    renderedGlyphs: undefined,
    selectedGlyphs: metadata.selectedGlyphs?.map((glyph) => ({
      url: glyph.url,
      token: glyph.token,
      line: glyph.line,
      softLine: glyph.softLine,
      available: glyph.available,
      isFallback: glyph.isFallback,
      jibo: glyph.jibo,
      position: glyph.position,
      glyphId: glyph.glyphId,
    })),
  };
}

function injectPacket(buffer: Buffer, packet: Buffer): Buffer {
  if (buffer.length < 2 || buffer.readUInt16BE(0) !== JPEG_SOI) {
    throw new Error('XMP metadata can only be embedded into JPEG buffers');
  }

  const segmentLength = packet.length + 2;
  if (segmentLength > MAX_APP1_SEGMENT_LENGTH) {
    throw new Error(`XMP metadata is too large for a JPEG APP1 segment: ${segmentLength} bytes`);
  }

  const marker = Buffer.allocUnsafe(4);
  marker[0] = 0xff;
  marker[1] = 0xe1;
  marker.writeUInt16BE(segmentLength, 2);

  return Buffer.concat([buffer.subarray(0, 2), marker, packet, buffer.subarray(2)]);
}

export function injectXmpMetadata(buffer: Buffer, metadata: GenerationMetadata): Buffer {
  return injectPacket(buffer, xmpPacketFromMetadata(metadata));
}

export function tryInjectXmpMetadata(
  buffer: Buffer,
  metadata: GenerationMetadata,
): XmpInjectionResult {
  try {
    return {
      buffer: injectPacket(buffer, xmpPacketFromMetadata(metadata)),
      embedded: true,
      mode: 'full',
    };
  } catch (error: unknown) {
    if (!(error instanceof Error) || !error.message.startsWith('XMP metadata is too large')) {
      throw error;
    }
  }

  try {
    return {
      buffer: injectPacket(buffer, xmpPacketFromMetadata(compactMetadata(metadata))),
      embedded: true,
      mode: 'compact',
    };
  } catch (error: unknown) {
    if (!(error instanceof Error) || !error.message.startsWith('XMP metadata is too large')) {
      throw error;
    }

    return {
      buffer,
      embedded: false,
      reason: error.message,
    };
  }
}
