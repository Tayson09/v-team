import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "./r2";
import { randomUUID } from "crypto";

export async function uploadToS3(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  const fileName = `${randomUUID()}-${file.name}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    })
  );

  return {
    fileName,
    url: `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${fileName}`,
  };
}