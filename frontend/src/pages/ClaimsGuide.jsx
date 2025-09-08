import React from "react";
import Container from "../components/Container";

export default function ClaimsGuide(){
  return (
    <section className="py-16">
      <Container>
        <h1 className="text-3xl font-bold text-gray-900">How to make a claim</h1>
        <ol className="mt-6 space-y-4 text-gray-700 list-decimal list-inside">
          <li>Have your invoice or receipt handy.</li>
          <li>Log in to your member area and go to <span className="font-medium">Submit a claim</span>.</li>
          <li>Upload the document, enter a short description and the amount billed.</li>
          <li>Track your status and view your Explanation of Benefits (EOB).</li>
        </ol>
        <p className="mt-6 text-sm text-gray-500">Tip: For big hospital bills, your provider may bill us directly.</p>
      </Container>
    </section>
  );
}
