"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ProductsPage() {
  // รายการสินค้าทั้งหมด
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ข้อมูลฟอร์มเพิ่มสินค้าใหม่
  const [newProduct, setNewProduct] = useState({
    sku: "",
    name: "",
    price: "",
    stock: "",
    unit: "",
  });

  // เก็บ id ของแถวที่กำลังแก้ไข และข้อมูลที่กำลังแก้
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  // ดึงข้อมูลสินค้าตอนโหลดหน้า
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
      setError(error.message);
    } else {
      setProducts(data);
      setError("");
    }
    setLoading(false);
  }

  // เพิ่มสินค้าใหม่
  async function handleAddProduct(e) {
    e.preventDefault();
    if (!newProduct.sku || !newProduct.name) return;

    const { error } = await supabase.from("products").insert([
      {
        sku: newProduct.sku,
        name: newProduct.name,
        price: parseFloat(newProduct.price) || 0,
        stock: parseInt(newProduct.stock) || 0,
        unit: newProduct.unit,
      },
    ]);

    if (error) {
      setError(error.message);
    } else {
      setNewProduct({ sku: "", name: "", price: "", stock: "", unit: "" });
      fetchProducts();
    }
  }

  // เริ่มแก้ไขแถว
  function startEdit(product) {
    setEditingId(product.id);
    setEditData({ ...product });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({});
  }

  // บันทึกการแก้ไข
  async function handleSaveEdit(id) {
    const { error } = await supabase
      .from("products")
      .update({
        sku: editData.sku,
        name: editData.name,
        price: parseFloat(editData.price) || 0,
        stock: parseInt(editData.stock) || 0,
        unit: editData.unit,
      })
      .eq("id", id);

    if (error) {
      setError(error.message);
    } else {
      setEditingId(null);
      setEditData({});
      fetchProducts();
    }
  }

  // ลบสินค้า
  async function handleDelete(id) {
    const confirmDelete = window.confirm("ต้องการลบสินค้านี้ใช่หรือไม่?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      setError(error.message);
    } else {
      fetchProducts();
    }
  }

  return (
    <div>
      <h1>รายการสินค้า</h1>

      {error && <p style={{ color: "red" }}>เกิดข้อผิดพลาด: {error}</p>}

      {/* ฟอร์มเพิ่มสินค้าใหม่ */}
      <div className="card">
        <h3>เพิ่มสินค้าใหม่</h3>
        <form onSubmit={handleAddProduct}>
          <div className="form-row">
            <input
              placeholder="SKU"
              value={newProduct.sku}
              onChange={(e) =>
                setNewProduct({ ...newProduct, sku: e.target.value })
              }
              required
            />
            <input
              placeholder="ชื่อสินค้า"
              value={newProduct.name}
              onChange={(e) =>
                setNewProduct({ ...newProduct, name: e.target.value })
              }
              required
            />
            <input
              type="number"
              placeholder="ราคา"
              value={newProduct.price}
              onChange={(e) =>
                setNewProduct({ ...newProduct, price: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="คงเหลือ"
              value={newProduct.stock}
              onChange={(e) =>
                setNewProduct({ ...newProduct, stock: e.target.value })
              }
            />
            <input
              placeholder="หน่วย"
              value={newProduct.unit}
              onChange={(e) =>
                setNewProduct({ ...newProduct, unit: e.target.value })
              }
            />
            <button type="submit">เพิ่มสินค้า</button>
          </div>
        </form>
      </div>

      {/* ตารางแสดงสินค้า */}
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
            {products.map((product) => {
              const isEditing = editingId === product.id;
              return (
                <tr key={product.id}>
                  {isEditing ? (
                    <>
                      <td>
                        <input
                          value={editData.sku}
                          onChange={(e) =>
                            setEditData({ ...editData, sku: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={editData.name}
                          onChange={(e) =>
                            setEditData({ ...editData, name: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editData.price}
                          onChange={(e) =>
                            setEditData({ ...editData, price: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editData.stock}
                          onChange={(e) =>
                            setEditData({ ...editData, stock: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={editData.unit}
                          onChange={(e) =>
                            setEditData({ ...editData, unit: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <button onClick={() => handleSaveEdit(product.id)}>
                          บันทึก
                        </button>{" "}
                        <button onClick={cancelEdit}>ยกเลิก</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{product.sku}</td>
                      <td>{product.name}</td>
                      <td>{product.price}</td>
                      <td>{product.stock}</td>
                      <td>{product.unit}</td>
                      <td>
                        <button onClick={() => startEdit(product)}>
                          แก้ไข
                        </button>{" "}
                        <button onClick={() => handleDelete(product.id)}>
                          ลบ
                        </button>
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
