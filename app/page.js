"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
  // เก็บรายการสินค้าทั้งหมด
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // เก็บค่าฟอร์มเพิ่มสินค้าใหม่
  const [form, setForm] = useState({
    sku: "",
    name: "",
    price: "",
    stock: "",
    unit: "",
  });

  // เก็บ id ของแถวที่กำลังแก้ไขอยู่ (inline edit) และค่าที่กำลังแก้
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // โหลดรายการสินค้าตอน mount
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg("โหลดข้อมูลสินค้าไม่สำเร็จ: " + error.message);
    } else {
      setProducts(data);
      setErrorMsg("");
    }
    setLoading(false);
  }

  // จัดการค่าฟอร์มเพิ่มสินค้าใหม่
  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // เพิ่มสินค้าใหม่ลงตาราง products
  async function handleAddProduct(e) {
    e.preventDefault();

    if (!form.sku || !form.name || !form.price || !form.stock || !form.unit) {
      alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    const { error } = await supabase.from("products").insert([
      {
        sku: form.sku,
        name: form.name,
        price: parseFloat(form.price),
        stock: parseInt(form.stock, 10),
        unit: form.unit,
      },
    ]);

    if (error) {
      alert("เพิ่มสินค้าไม่สำเร็จ: " + error.message);
      return;
    }

    // เคลียร์ฟอร์มและโหลดข้อมูลใหม่
    setForm({ sku: "", name: "", price: "", stock: "", unit: "" });
    fetchProducts();
  }

  // ลบสินค้า
  async function handleDelete(id) {
    const confirmDelete = confirm("ยืนยันลบสินค้านี้หรือไม่?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      alert("ลบสินค้าไม่สำเร็จ: " + error.message);
      return;
    }
    fetchProducts();
  }

  // เริ่มแก้ไขแถว (inline edit)
  function startEdit(product) {
    setEditingId(product.id);
    setEditForm({
      sku: product.sku,
      name: product.name,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
    });
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  // บันทึกการแก้ไขสินค้า
  async function saveEdit(id) {
    const { error } = await supabase
      .from("products")
      .update({
        sku: editForm.sku,
        name: editForm.name,
        price: parseFloat(editForm.price),
        stock: parseInt(editForm.stock, 10),
        unit: editForm.unit,
      })
      .eq("id", id);

    if (error) {
      alert("แก้ไขสินค้าไม่สำเร็จ: " + error.message);
      return;
    }

    setEditingId(null);
    setEditForm({});
    fetchProducts();
  }

  return (
    <div>
      <h1>รายการสินค้า</h1>

      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      {/* ฟอร์มเพิ่มสินค้าใหม่ */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>เพิ่มสินค้าใหม่</h2>
        <form
          onSubmit={handleAddProduct}
          style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
        >
          <input
            name="sku"
            placeholder="SKU"
            value={form.sku}
            onChange={handleFormChange}
            style={{ width: 100 }}
          />
          <input
            name="name"
            placeholder="ชื่อสินค้า"
            value={form.name}
            onChange={handleFormChange}
            style={{ width: 160 }}
          />
          <input
            name="price"
            type="number"
            step="0.01"
            placeholder="ราคา"
            value={form.price}
            onChange={handleFormChange}
            style={{ width: 90 }}
          />
          <input
            name="stock"
            type="number"
            placeholder="คงเหลือ"
            value={form.stock}
            onChange={handleFormChange}
            style={{ width: 90 }}
          />
          <input
            name="unit"
            placeholder="หน่วย"
            value={form.unit}
            onChange={handleFormChange}
            style={{ width: 80 }}
          />
          <button type="submit">เพิ่มสินค้า</button>
        </form>
      </div>

      {/* ตารางรายการสินค้า */}
      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>ชื่อสินค้า</th>
              <th>ราคา</th>
              <th>คงเหลือ</th>
              <th>หน่วย</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={6}>ยังไม่มีสินค้าในระบบ</td>
              </tr>
            )}
            {products.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <tr key={p.id}>
                  {isEditing ? (
                    <>
                      <td>
                        <input
                          name="sku"
                          value={editForm.sku}
                          onChange={handleEditChange}
                          style={{ width: 80 }}
                        />
                      </td>
                      <td>
                        <input
                          name="name"
                          value={editForm.name}
                          onChange={handleEditChange}
                          style={{ width: 140 }}
                        />
                      </td>
                      <td>
                        <input
                          name="price"
                          type="number"
                          step="0.01"
                          value={editForm.price}
                          onChange={handleEditChange}
                          style={{ width: 80 }}
                        />
                      </td>
                      <td>
                        <input
                          name="stock"
                          type="number"
                          value={editForm.stock}
                          onChange={handleEditChange}
                          style={{ width: 70 }}
                        />
                      </td>
                      <td>
                        <input
                          name="unit"
                          value={editForm.unit}
                          onChange={handleEditChange}
                          style={{ width: 60 }}
                        />
                      </td>
                      <td style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => saveEdit(p.id)}>บันทึก</button>
                        <button onClick={cancelEdit}>ยกเลิก</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{p.sku}</td>
                      <td>{p.name}</td>
                      <td>{p.price}</td>
                      <td>{p.stock}</td>
                      <td>{p.unit}</td>
                      <td style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => startEdit(p)}>แก้ไข</button>
                        <button onClick={() => handleDelete(p.id)}>ลบ</button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
