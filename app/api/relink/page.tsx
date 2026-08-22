"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function RelinkVerifyPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your identity...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No token provided in the URL.");
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch("/api/relink/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, device_uuid: crypto.randomUUID() }),
        });

        if (res.ok) {
          const data = await res.json();
          setStatus("success");
          setMessage(
            `Welcome back, ${data.name} from ${data.city}! Your device has been successfully linked to your account.`
          );
        } else {
          const error = await res.json();
          setStatus("error");
          setMessage(
            error.error ||
              "This verification link is invalid or has expired. Please request a new one."
          );
        }
      } catch (err) {
        setStatus("error");
        setMessage(
          "Unable to verify your identity. Please check your connection and try again."
        );
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {status === "loading" && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Verifying Identity
            </h2>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Identity Verified!
            </h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500">
              You can now return to your original device and continue using your invitation.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Verification Failed
            </h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <a
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Home
            </a>
          </div>
        )}
      </div>
    </div>
  );
}