"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function SellPage() {
  // รายการสินค้าทั้งหมด (สำหรับ dropdown)
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ค่าที่กำลังจะเพิ่มลงตะกร้า
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("");

  // ตะกร้าสินค้า: array ของ { id, name, price, unit, stock, quantity }
  const [cart, setCart] = useState([]);

  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const selectedProduct = products.find((p) => p.id === selectedId);

  // จำนวนคงเหลือของสินค้าที่เลือก โดยหักลบจำนวนที่อยู่ในตะกร้าแล้ว (กันขายเกิน stock จริง)
  const inCartQty = cart
    .filter((item) => item.id === selectedId)
    .reduce((sum, item) => sum + item.quantity, 0);
  const availableStock = selectedProduct
    ? selectedProduct.stock - inCartQty
    : 0;

  // เพิ่มสินค้าลงตะกร้า
  function handleAddToCart(e) {
    e.preventDefault();
    setErrorMsg("");
    setMessage("");

    const qtyNumber = parseInt(quantity, 10) || 0;

    if (!selectedProduct) {
      setErrorMsg("กรุณาเลือกสินค้า");
      return;
    }
    if (!qtyNumber || qtyNumber <= 0) {
      setErrorMsg("กรุณากรอกจำนวนที่ถูกต้อง");
      return;
    }
    if (qtyNumber > availableStock) {
      setErrorMsg(
        `สินค้าคงเหลือไม่พอ (คงเหลือ ${availableStock} ${selectedProduct.unit})`
      );
      return;
    }

    // ถ้าสินค้านี้อยู่ในตะกร้าแล้ว ให้รวมจำนวนเข้าด้วยกัน
    setCart((prev) => {
      const existing = prev.find((item) => item.id === selectedProduct.id);
      if (existing) {
        return prev.map((item) =>
          item.id === selectedProduct.id
            ? { ...item, quantity: item.quantity + qtyNumber }
            : item
        );
      }
      return [
        ...prev,
        {
          id: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          unit: selectedProduct.unit,
          stock: selectedProduct.stock,
          quantity: qtyNumber,
        },
      ];
    });

    setSelectedId("");
    setQuantity("");
  }

  // ลบสินค้าออกจากตะกร้า
  function handleRemoveFromCart(id) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  // แก้จำนวนสินค้าในตะกร้าโดยตรง
  function handleCartQtyChange(id, value) {
    const qtyNumber = parseInt(value, 10) || 0;
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: qtyNumber } : item))
    );
  }

  // ยอดรวมทั้งบิล
  const grandTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // ยืนยันการขายทั้งตะกร้า
  async function handleConfirmSale() {
    setErrorMsg("");
    setMessage("");

    if (cart.length === 0) {
      setErrorMsg("ยังไม่มีสินค้าในตะกร้า");
      return;
    }
    if (cart.some((item) => !item.quantity || item.quantity <= 0)) {
      setErrorMsg("มีรายการที่จำนวนไม่ถูกต้อง");
      return;
    }
    if (cart.some((item) => item.quantity > item.stock)) {
      setErrorMsg("มีรายการที่จำนวนเกินสต็อกคงเหลือ กรุณาตรวจสอบอีกครั้ง");
      return;
    }

    setSubmitting(true);

    // สร้างแถวสำหรับตาราง sales หนึ่งแถวต่อหนึ่งสินค้าในตะกร้า
    const soldAt = new Date().toISOString();
    const salesRows = cart.map((item) => ({
      product_id: item.id,
      product_name: item.name,
      quantity: item.quantity,
      total_price: item.price * item.quantity,
      sold_at: soldAt,
    }));

    const { error: saleError } = await supabase.from("sales").insert(salesRows);

    if (saleError) {
      setErrorMsg("บันทึกการขายไม่สำเร็จ: " + saleError.message);
      setSubmitting(false);
      return;
    }

    // อัปเดต stock ของสินค้าแต่ละชิ้นทีละรายการ
    for (const item of cart) {
      const newStock = item.stock - item.quantity;
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.id);

      if (updateError) {
        setErrorMsg(
          `ขายสำเร็จบางส่วน แต่ปรับสต็อกของ "${item.name}" ไม่สำเร็จ: ${updateError.message}`
        );
        setSubmitting(false);
        fetchProducts();
        return;
      }
    }

    setMessage(`ขายสำเร็จ! ยอดรวม ${grandTotal.toFixed(2)} บาท`);
    setCart([]);
    setSubmitting(false);
    fetchProducts();
  }

  return (
    <div>
      <h1>ขายสินค้า</h1>

      {/* ยอดรวมตัวใหญ่ไว้บนสุด ให้ทั้งผู้ขายและลูกค้าเห็นชัด */}
      <div
        className="card"
        style={{
          textAlign: "center",
          padding: "20px",
          background: "#1a1a1a",
          color: "#ffffff",
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>
          ยอดรวมทั้งหมด
        </div>
        <div style={{ fontSize: 42, fontWeight: 800 }}>
          {grandTotal.toFixed(2)} บาท
        </div>
      </div>

      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
      {message && <p style={{ color: "green" }}>{message}</p>}

      {loading ? (
        <p>กำลังโหลดข้อมูลสินค้า...</p>
      ) : (
        <>
          {/* ฟอร์มเลือกสินค้าเพื่อเพิ่มลงตะกร้า */}
          <div className="card">
            <h2 style={{ marginTop: 0 }}>เพิ่มสินค้า</h2>
            <form
              onSubmit={handleAddToCart}
              style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
            >
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                style={{ width: 240, fontSize: 16, padding: "10px" }}
              >
                <option value="">-- เลือกสินค้า --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.price} บาท/{p.unit}) - เหลือ {p.stock}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                placeholder="จำนวน"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ width: 100, fontSize: 16, padding: "10px" }}
              />

              {selectedProduct && (
                <span style={{ color: "#666" }}>
                  คงเหลือหลังหักตะกร้า: {availableStock} {selectedProduct.unit}
                </span>
              )}

              <button type="submit" style={{ fontSize: 16, padding: "10px 18px" }}>
                + เพิ่มลงตะกร้า
              </button>
            </form>
          </div>

          {/* ตารางตะกร้าสินค้า - แสดงชัดเจน ตัวใหญ่ อ่านง่าย */}
          <div className="card">
            <h2 style={{ marginTop: 0 }}>รายการที่จะขาย</h2>
            {cart.length === 0 ? (
              <p style={{ color: "#888" }}>ยังไม่มีสินค้าในตะกร้า</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>สินค้า</th>
                    <th>ราคา/หน่วย</th>
                    <th>จำนวน</th>
                    <th>รวม</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontSize: 16 }}>{item.name}</td>
                      <td>
                        {item.price} บาท/{item.unit}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleCartQtyChange(item.id, e.target.value)
                          }
                          style={{ width: 70 }}
                        />
                      </td>
                      <td style={{ fontSize: 16, fontWeight: 700 }}>
                        {(item.price * item.quantity).toFixed(2)}
                      </td>
                      <td>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          style={{ background: "#c0392b" }}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <button
              onClick={handleConfirmSale}
              disabled={submitting || cart.length === 0}
              style={{
                marginTop: 16,
                width: "100%",
                fontSize: 20,
                padding: "16px",
                fontWeight: 700,
              }}
            >
              {submitting ? "กำลังบันทึก..." : "ยืนยันการขาย"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
