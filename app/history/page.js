"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function HistoryPage() {
  // รายการประวัติการขายทั้งหมด
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // โหลดข้อมูลตอน mount
  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("sold_at", { ascending: false }); // ล่าสุดไปเก่าสุด

    if (error) {
      setErrorMsg("โหลดประวัติการขายไม่สำเร็จ: " + error.message);
    } else {
      setSales(data);
      setErrorMsg("");
    }
    setLoading(false);
  }

  // คำนวณยอดขายรวมทั้งหมดจาก total_price ของทุกแถว
  const grandTotal = sales.reduce((sum, s) => sum + Number(s.total_price), 0);

  // จัดรูปแบบวันเวลาให้อ่านง่าย
  function formatDateTime(isoString) {
    const d = new Date(isoString);
    return d.toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div>
      <h1>ประวัติการขาย</h1>

      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      {/* สรุปยอดขายรวม */}
      <div className="card" style={{ fontSize: 18, fontWeight: 600 }}>
        ยอดขายรวมทั้งหมด: {grandTotal.toFixed(2)} บาท
      </div>

      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>วันเวลาที่ขาย</th>
              <th>ชื่อสินค้า</th>
              <th>จำนวน</th>
              <th>ยอดรวม</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={4}>ยังไม่มีประวัติการขาย</td>
              </tr>
            )}
            {sales.map((s) => (
              <tr key={s.id}>
                <td>{formatDateTime(s.sold_at)}</td>
                <td>{s.product_name}</td>
                <td>{s.quantity}</td>
                <td>{Number(s.total_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
