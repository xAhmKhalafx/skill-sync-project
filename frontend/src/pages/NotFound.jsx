import React from "react";
export default function NotFound(){
  return (
    <div className="min-h-[60vh] grid place-items-center text-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Page not found</h1>
        <p className="text-gray-600 mt-2">Sorry, we couldn’t find that page.</p>
        <a href="/" className="inline-block mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">Go home</a>
      </div>
    </div>
  );
}