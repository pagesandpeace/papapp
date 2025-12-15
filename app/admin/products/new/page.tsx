"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import Image from "next/image";

export default function CreateProductPage() {
  const router = useRouter();

  // FORM FIELDS
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [price, setPrice] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);

  const [productType, setProductType] = useState("merch"); // merch | book | other

  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* -------------------------------
      IMAGE UPLOAD → CLOUDINARY API
  -------------------------------- */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);

    const form = new FormData();
    form.append("file", file);

    const uploadRes = await fetch("/api/admin/events/upload-image", {
      method: "POST",
      body: form,
      credentials: "include",
    });

    const data = await uploadRes.json();

    if (!uploadRes.ok) {
      setUploading(false);
      setErrorMsg(data.error || "Image upload failed.");
      return;
    }

    setImageUrl(data.url);
    setUploading(false);
  }

  /* -------------------------------
      SUBMIT FORM
  -------------------------------- */
  async function handleSubmit() {
    setSubmitting(true);
    setErrorMsg(null);

    if (!name || price <= 0) {
      setSubmitting(false);
      setErrorMsg("Name and price are required.");
      return;
    }

    const payload = {
      name,
      description,
      price, // DECIMAL stored as STRING in DB
      inventory_count: inventoryCount,
      product_type: productType,
      image_url: imageUrl,
    };

    const res = await fetch("/api/admin/products/create", {
      method: "POST",
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("PRODUCT CREATE FAILED:", errText);
      setSubmitting(false);
      setErrorMsg("Failed to create product.");
      return;
    }

    router.push("/admin/products");
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Create Product</h1>

      <div className="space-y-6">
        {errorMsg && <Alert type="error" message={errorMsg} />}

        {/* NAME */}
        <div>
          <label className="block mb-1 text-sm font-medium">Name *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* PRODUCT TYPE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Product Type *</label>
          <select
            className="border rounded-md px-3 py-2 w-full"
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
          >
            <option value="merch">Merch</option>
            <option value="book">Book</option>
            <option value="event">Event (disabled)</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block mb-1 text-sm font-medium">Description</label>
          <TextArea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* PRICE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Price (£) *</label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>

        {/* INVENTORY COUNT */}
        <div>
          <label className="block mb-1 text-sm font-medium">Inventory Count</label>
          <Input
            type="number"
            min={0}
            value={inventoryCount}
            onChange={(e) => setInventoryCount(Number(e.target.value))}
          />
        </div>

        {/* IMAGE UPLOAD */}
        <div>
          <label className="block mb-1 text-sm font-medium">Product Image</label>

          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
            <div className="flex flex-col items-center pt-5 pb-6 text-gray-500">
              <svg
                aria-hidden="true"
                className="w-8 h-8 mb-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 15a4 4 0 014-4h10a4 4 0 014 4v4H3v-4zM7 11l5-5m0 0l5 5m-5-5v12"
                ></path>
              </svg>

              <p className="text-sm font-medium">Upload product image</p>
              <p className="text-xs">PNG, JPG • under 5MB</p>
            </div>

            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleUpload}
            />
          </label>

          {uploading && <p className="text-sm mt-2">Uploading…</p>}

          {imageUrl && (
            <div className="mt-3">
              <Image
                src={imageUrl}
                alt="Preview"
                width={300}
                height={300}
                className="object-cover rounded-lg border shadow"
              />
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-4 pt-6">
          <Button
            variant="primary"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Creating…" : "Create Product"}
          </Button>

          <Button
            variant="neutral"
            onClick={() => router.push("/admin/products")}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
