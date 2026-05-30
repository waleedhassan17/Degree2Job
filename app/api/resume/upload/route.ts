import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;
const PDF_TYPE = "application/pdf";
const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function extractText(buffer: Buffer, type: string): Promise<string> {
  if (type === PDF_TYPE) {
    // pdf-parse is CJS; import dynamically to keep the route lean.
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (type === DOCX_TYPE) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  throw new Error("Unsupported file type");
}

async function maybeUploadToBlob(
  file: File,
  sessionId: string
): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { put } = await import("@vercel/blob");
    const blob = await put(`resumes/${sessionId}-${file.name}`, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  } catch {
    return null; // Storage is best-effort; parsing still proceeds.
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const sessionId = (form.get("sessionId") as string) || "anonymous";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.type !== PDF_TYPE && file.type !== DOCX_TYPE) {
      return NextResponse.json(
        { error: "Only PDF and DOCX files are supported" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 5MB limit" },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let rawText: string;
    try {
      rawText = (await extractText(buffer, file.type)).trim();
    } catch {
      return NextResponse.json(
        { error: "Could not read text from this file. Try a different export." },
        { status: 500 }
      );
    }

    if (!rawText) {
      return NextResponse.json(
        { error: "This file appears to contain no readable text." },
        { status: 422 }
      );
    }

    const fileUrl = await maybeUploadToBlob(file, sessionId);

    return NextResponse.json({ fileUrl, rawText, sessionId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
