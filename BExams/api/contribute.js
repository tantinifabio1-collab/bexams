import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

const COURSES = new Set(["CLEAM", "BIEM", "BIEF", "BIG", "BEMACS", "BEMACC", "BAI", "BGL", "BESS"]);
const YEARS = new Set(["1", "2", "3", "altro"]);
const TYPES = new Set(["1° Parziale", "2° Parziale", "Generale", "Correzione", "Altro"]);
const ALLOWED_EXTENSIONS = /\.(pdf|zip|doc|docx|xls|xlsx|png|jpe?g)$/i;
const MAX_BYTES = 4 * 1024 * 1024;

export const config = { api: { bodyParser: false } };

function reply(response, status, body) {
  response.setHeader("Cache-Control", "no-store");
  return response.status(status).json(body);
}

function safeName(value, fallback = "file") {
  const cleaned = String(value || "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return cleaned || fallback;
}

function readMetadata(request) {
  const encoded = request.headers["x-bexams-metadata"];
  if (!encoded || Array.isArray(encoded) || encoded.length > 12000) throw new Error("Metadati mancanti o non validi.");
  const data = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  return {
    course: String(data.course || ""),
    year: String(data.year || ""),
    subject: String(data.subject || "").trim().slice(0, 100),
    type: String(data.type || ""),
    note: String(data.note || "").trim().slice(0, 1500),
    fileName: String(data.fileName || "").trim().slice(0, 180),
    hasFile: data.hasFile === true,
    rights: data.rights === true,
  };
}

async function authenticatedUser(idToken) {
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey || !idToken) return null;
  const verification = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!verification.ok) return null;
  const result = await verification.json();
  return result.users?.[0] || null;
}

async function readFileBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bytes.length;
    if (total > MAX_BYTES) {
      const error = new Error("FILE_TOO_LARGE");
      error.code = "FILE_TOO_LARGE";
      throw error;
    }
    chunks.push(bytes);
  }
  const buffer = Buffer.concat(chunks);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export default async function contribute(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return reply(response, 405, { error: "Metodo non consentito." });
  }

  try {
    const authorization = String(request.headers.authorization || "");
    const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const user = await authenticatedUser(idToken);
    if (!user) return reply(response, 401, { error: "Accedi di nuovo prima di inviare il contributo." });

    const data = readMetadata(request);
    if (!COURSES.has(data.course) || !YEARS.has(data.year) || !TYPES.has(data.type) || !data.subject) {
      return reply(response, 400, { error: "Completa correttamente corso, anno, materia e tipo." });
    }
    if (!data.rights) return reply(response, 400, { error: "Devi confermare di poter condividere il materiale." });
    if (!data.hasFile && !data.note) return reply(response, 400, { error: "Allega un file oppure scrivi un contributo." });
    if (data.hasFile && !ALLOWED_EXTENSIONS.test(data.fileName)) return reply(response, 400, { error: "Formato del file non supportato." });

    const contentLength = Number(request.headers["content-length"] || 0);
    if (data.hasFile && contentLength > MAX_BYTES) {
      return reply(response, 413, { error: "Il file deve essere più piccolo di 4 MB." });
    }

    const contributionId = `${Date.now()}-${randomUUID()}`;
    const folder = `contributi/${safeName(data.course)}/${contributionId}`;
    let uploadedFile = null;
    let uploadedSize = 0;
    if (data.hasFile) {
      const fileBody = await readFileBody(request);
      uploadedSize = fileBody.byteLength;
      if (!uploadedSize) return reply(response, 400, { error: "Il file allegato è vuoto." });
      uploadedFile = await put(`${folder}/${safeName(data.fileName)}`, fileBody, {
        access: "private",
        addRandomSuffix: false,
        contentType: String(request.headers["content-type"] || "application/octet-stream").slice(0, 100),
      });
    }

    const metadata = {
      id: contributionId,
      course: data.course,
      year: data.year,
      subject: data.subject,
      type: data.type,
      note: data.note,
      submittedAt: new Date().toISOString(),
      submittedBy: { uid: user.localId || "", email: user.email || "", name: user.displayName || "" },
      file: uploadedFile ? { pathname: uploadedFile.pathname, contentType: uploadedFile.contentType || "", size: uploadedSize } : null,
      status: "da-controllare",
      rightsConfirmed: true,
    };
    await put(`${folder}/dati.json`, JSON.stringify(metadata, null, 2), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json; charset=utf-8",
    });

    return reply(response, 201, { ok: true, id: contributionId });
  } catch (error) {
    console.error("BExams contribution error", error);
    if (error?.code === "FILE_TOO_LARGE") return reply(response, 413, { error: "Il file deve essere più piccolo di 4 MB." });
    const missingBlob = /BLOB|token|store|credential/i.test(String(error?.message || ""));
    return reply(response, 503, {
      error: missingBlob
        ? "L'archivio dei contributi non è ancora collegato su Vercel. Riprova più tardi."
        : "Non sono riuscito a salvare il contributo. Riprova tra poco.",
    });
  }
}
