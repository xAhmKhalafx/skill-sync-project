import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function InsurerConsole(){
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(()=>{
    (async ()=>{
      try { setClaims(await api.listClaims()); }
      catch (e) { setError(String(e)); }
      setLoading(false);
    })();
  },[]);

  return (
    <div className="py-10 max-w-6xl mx-auto px-4">
      <h1 className="text-2xl font-bold text-gray-900">Insurer console</h1>
      {loading && <p className="mt-6 text-gray-600">Loading…</p>}
      {error && <p className="mt-6 text-red-600">{error}</p>}
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-700">
              <th className="py-2 pr-4">Claim ID</th>
              <th className="py-2 pr-4">Procedure</th>
              <th className="py-2 pr-4">Amount</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {claims.map(c => (
              <tr key={c.id} className="border-t">
                <td className="py-2 pr-4">{c.id}</td>
                <td className="py-2 pr-4">{c.procedure}</td>
                <td className="py-2 pr-4">${c.amount}</td>
                <td className="py-2 pr-4">{c.status}</td>
                <td className="py-2 pr-4">
                  <a className="text-blue-700 font-semibold" href={`/user/dashboard/${c.id}`}>Open →</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}