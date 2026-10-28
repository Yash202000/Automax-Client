// Checks a file's first bytes ("magic numbers") against its extension, so a
// renamed file (e.g. an .exe saved as .pdf) is caught before upload.
// Only a quick client-side check: the server must still verify uploads.

type Signature = { offset?: number; bytes: number[] };

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

const ZIP = [
  { bytes: [0x50, 0x4b, 0x03, 0x04] },
  { bytes: [0x50, 0x4b, 0x05, 0x06] },
];
const OLE = [{ bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }]; // .doc/.xls/.ppt
const RIFF = [{ bytes: ascii("RIFF") }];
const ISO_MEDIA = [{ offset: 4, bytes: ascii("ftyp") }]; // mp4, m4a, heic
const MATROSKA = [{ bytes: [0x1a, 0x45, 0xdf, 0xa3] }];

// Extensions without an entry (txt, csv, mp3, aac, ...) have no reliable
// signature; they are only checked for executable content.
const SIGNATURES: Record<string, Signature[]> = {
  pdf: [{ bytes: ascii("%PDF") }],
  png: [{ bytes: [0x89, 0x50, 0x4e, 0x47] }],
  jpg: [{ bytes: [0xff, 0xd8, 0xff] }],
  jpeg: [{ bytes: [0xff, 0xd8, 0xff] }],
  gif: [{ bytes: ascii("GIF8") }],
  bmp: [{ bytes: ascii("BM") }],
  webp: RIFF,
  heic: ISO_MEDIA,
  rtf: [{ bytes: ascii("{\\rtf") }],
  doc: OLE,
  xls: OLE,
  ppt: OLE,
  docx: ZIP,
  xlsx: ZIP,
  pptx: ZIP,
  odt: ZIP,
  ods: ZIP,
  odp: ZIP,
  zip: ZIP,
  rar: [{ bytes: ascii("Rar!") }],
  "7z": [{ bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] }],
  wav: RIFF,
  avi: RIFF,
  ogg: [{ bytes: ascii("OggS") }],
  flac: [{ bytes: ascii("fLaC") }],
  mp4: ISO_MEDIA,
  m4a: ISO_MEDIA,
  mov: [
    ...ISO_MEDIA,
    { offset: 4, bytes: ascii("moov") },
    { offset: 4, bytes: ascii("mdat") },
    { offset: 4, bytes: ascii("wide") },
    { offset: 4, bytes: ascii("free") },
  ],
  mkv: MATROSKA,
  webm: MATROSKA,
};

// Windows (MZ) and Linux (ELF) executables are rejected whatever the extension.
const EXECUTABLES: Signature[] = [
  { bytes: ascii("MZ") },
  { bytes: [0x7f, 0x45, 0x4c, 0x46] },
];

const matches = (header: Uint8Array, { offset = 0, bytes }: Signature) =>
  bytes.every((byte, i) => header[offset + i] === byte);

/** True when the file's content looks like its extension says it is. */
export async function contentMatchesExtension(
  file: File,
  extension: string,
): Promise<boolean> {
  if (file.size === 0) return true;
  let header: Uint8Array;
  try {
    header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  } catch {
    return true; // Unreadable here; leave it to the server.
  }
  if (EXECUTABLES.some((sig) => matches(header, sig))) return false;
  const expected = SIGNATURES[extension];
  return !expected || expected.some((sig) => matches(header, sig));
}
