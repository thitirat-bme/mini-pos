"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function SellPage() {
  // รายการสินค้าทั้งหมด (สำหรับ dropdown)
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ค่าที่ผู้ใช้เลือก/กรอก
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("");

  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // โหลดรายการสินค้าตอน mount
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setErrorMsg("โหลดข้อมูลสินค้าไม่สำเร็จ: " + error.message);
    } else {
      setProducts(data);
      setErrorMsg("");
    }
    setLoading(false);
  }

  // หาสินค้าที่เลือกอยู่ตอนนี้ จาก id
  const selectedProduct = products.find((p) => p.id === selectedId);

  // คำนวณยอดรวม = ราคา x จำนวน
  const qtyNumber = parseInt(quantity, 10) || 0;
  const totalPrice = selectedProduct ? selectedProduct.price * qtyNumber : 0;

  async function handleSell(e) {
    e.preventDefault();
    setMessage("");
    setErrorMsg("");

    if (!selectedProduct) {
      setErrorMsg("กรุณาเลือกสินค้า");
      return;
    }
    if (!qtyNumber || qtyNumber <= 0) {
      setErrorMsg("กรุณากรอกจำนวนที่ถูกต้อง");
      return;
    }

    // ตรวจสอบ stock เพียงพอหรือไม่
    if (qtyNumber > selectedProduct.stock) {
      setErrorMsg(
        `สินค้าคงเหลือไม่พอ (คงเหลือ ${selectedProduct.stock} ${selectedProduct.unit})`
      );
      return;
    }

    setSubmitting(true);

    // 1) บันทึกรายการขายลงตาราง sales
    const { error: saleError } = await supabase.from("sales").insert([
      {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: qtyNumber,
        total_price: totalPrice,
        sold_at: new Date().toISOString(),
      },
    ]);

    if (saleError) {
      setErrorMsg("บันทึกการขายไม่สำเร็จ: " + saleError.message);
      setSubmitting(false);
      return;
    }

    // 2) อัปเดต stock ของสินค้าให้ลดลงตามจำนวนที่ขาย
    const newStock = selectedProduct.stock - qtyNumber;
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", selectedProduct.id);

    if (updateError) {
      setErrorMsg("ขายสำเร็จ แต่ปรับปรุงสต็อกไม่สำเร็จ: " + updateError.message);
      setSubmitting(false);
      return;
    }

    // สำเร็จ: แสดงข้อความ, รีเซ็ตฟอร์ม, โหลดข้อมูลสินค้าใหม่
    setMessage(
      `ขายสำเร็จ: ${selectedProduct.name} x ${qtyNumber} รวม ${totalPrice.toFixed(2)} บาท`
    );
    setSelectedId("");
    setQuantity("");
    setSubmitting(false);
    fetchProducts();
  }

  return (
    <div>
      <h1>ขายสินค้า</h1>

      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
      {message && <p style={{ color: "green" }}>{message}</p>}

      {loading ? (
        <p>กำลังโหลดข้อมูลสินค้า...</p>
      ) : (
        <div className="card">
          <form onSubmit={handleSell}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>
                เลือกสินค้า
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                style={{ width: 260 }}
              >
                <option value="">-- เลือกสินค้า --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.price} บาท/{p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>
                จำนวน
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ width: 120 }}
              />
              {selectedProduct && (
                <span style={{ marginLeft: 8, color: "#666" }}>
                  คงเหลือ: {selectedProduct.stock} {selectedProduct.unit}
                </span>
              )}
            </div>

            {/* แสดงยอดรวมแบบ real-time */}
            <div style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>
              ยอดรวม: {totalPrice.toFixed(2)} บาท
            </div>

            <button type="submit" disabled={submitting}>
              {submitting ? "กำลังบันทึก..." : "ขาย"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
