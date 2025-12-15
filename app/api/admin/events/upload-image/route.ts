import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// 🔥 Make sure these are in your .env.local
// CLOUDINARY_CLOUD_NAME=xxx
// CLOUDINARY_API_KEY=xxx
// CLOUDINARY_API_SECRET=xxx

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Convert file -> base64 buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary folder
    const upload = await cloudinary.uploader.upload_stream(
      {
        folder: "pagesandpeace/events",
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          console.error("Cloudinary error:", error);
          return;
        }
      }
    );

    // We need to return a Promise because upload_stream is callback-based
    const result: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "pagesandpeace/events",
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(buffer);
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Image upload failed" },
      { status: 500 }
    );
  }
}
