"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

const LOW_STOCK_THRESHOLD = 5; // เกณฑ์เตือนสต๊อกใกล้หมด

// ส่งข้อความแจ้งเตือนผ่าน API Route ของเราเอง (ไม่ยิง Telegram ตรงๆ)
// Bot Token จะถูกเก็บไว้ฝั่ง server เท่านั้น ปลอดภัยกว่า
async function sendTelegramMessage(messageText) {
  try {
    const res = await fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: messageText }),
    });

    if (!res.ok) {
      const detail = await res.json();
      console.error("ส่ง Telegram ไม่สำเร็จ:", detail);
    }
  } catch (err) {
    console.error("เกิดข้อผิดพลาดตอนส่ง Telegram:", err);
  }
}

// ข้อความแจ้งเตือนรายการขายใหม่
function buildNewOrderMessage({ name, quantity, totalPrice, stockLeft, unit }) {
  const time = new Date().toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return [
    "🛍️ <b>มีรายการขายใหม่!</b>",
    `- สินค้า: ${name}`,
    `- จำนวน: ${quantity} ${unit}`,
    `- ราคารวม: ${totalPrice} บาท`,
    `- สต๊อกคงเหลือปัจจุบัน: ${stockLeft} ${unit}`,
    `- เวลา: ${time}`,
  ].join("\n");
}

// ข้อความเตือนภัยสต๊อกใกล้หมด
function buildLowStockMessage({ name, stockLeft, unit }) {
  return [
    "🚨 <b>[เตือนภัย] สต๊อกสินค้าใกล้หมด!</b>",
    `- สินค้า: ${name}`,
    `- คงเหลือเพียง: ${stockLeft} ${unit}`,
    "⚠️ กรุณาเติมสต๊อกสินค้าด่วน!",
  ].join("\n");
}

export default function SellPage() {
  // รายการสินค้าทั้งหมด (สำหรับ dropdown)
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // สินค้าที่เลือกขาย และจำนวน
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ดึงรายการสินค้าตอนโหลดหน้า
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
      setError(error.message);
    } else {
      setProducts(data);
      setError("");
    }
    setLoading(false);
  }

  // หาสินค้าที่กำลังถูกเลือกอยู่ (ใช้คำนวณยอดรวมและเช็ค stock)
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const parsedQuantity = parseInt(quantity) || 0;
  const totalPrice = selectedProduct
    ? selectedProduct.price * parsedQuantity
    : 0;

  async function handleSell(e) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!selectedProduct) {
      setError("กรุณาเลือกสินค้า");
      return;
    }
    if (parsedQuantity <= 0) {
      setError("กรุณากรอกจำนวนที่ต้องการขายให้ถูกต้อง");
      return;
    }
    // ตรวจสอบ stock คงเหลือให้เพียงพอก่อนขาย
    if (parsedQuantity > selectedProduct.stock) {
      setError(
        `สินค้าคงเหลือไม่พอ (เหลือ ${selectedProduct.stock} ${selectedProduct.unit})`
      );
      return;
    }

    setSubmitting(true);

    // บันทึกรายการขายลงตาราง sales
    const { error: saleError } = await supabase.from("sales").insert([
      {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: parsedQuantity,
        total_price: totalPrice,
      },
    ]);

    if (saleError) {
      setError(saleError.message);
      setSubmitting(false);
      return;
    }

    // อัปเดต stock ของสินค้าให้ลดลงตามจำนวนที่ขาย
    const newStock = selectedProduct.stock - parsedQuantity;
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", selectedProduct.id);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    // ===== ตัดสต๊อกสำเร็จแล้ว: ส่งแจ้งเตือนเข้า Telegram =====
    // ถ้าส่งไม่สำเร็จ ระบบขายยังทำงานต่อได้ตามปกติ
    await sendTelegramMessage(
      buildNewOrderMessage({
        name: selectedProduct.name,
        quantity: parsedQuantity,
        totalPrice: totalPrice,
        stockLeft: newStock,
        unit: selectedProduct.unit,
      })
    );

    // ถ้าสต๊อกหลังตัดเหลือน้อยกว่าหรือเท่ากับเกณฑ์ ให้ยิงเตือนภัยอีก 1 ข้อความ
    if (newStock <= LOW_STOCK_THRESHOLD) {
      await sendTelegramMessage(
        buildLowStockMessage({
          name: selectedProduct.name,
          stockLeft: newStock,
          unit: selectedProduct.unit,
        })
      );
    }

    // สำเร็จ: แจ้งเตือน รีเซ็ตฟอร์ม และโหลดข้อมูลสินค้าใหม่
    setSuccessMessage(
      `ขาย "${selectedProduct.name}" จำนวน ${parsedQuantity} ${selectedProduct.unit} สำเร็จ (รวม ${totalPrice} บาท)`
    );
    setSelectedProductId("");
    setQuantity("");
    setSubmitting(false);
    fetchProducts();
  }

  return (
    <div>
      <h1>ขายสินค้า</h1>

      {error && <p style={{ color: "red" }}>เกิดข้อผิดพลาด: {error}</p>}
      {successMessage && (
        <p style={{ color: "green" }}>{successMessage}</p>
      )}

      {loading ? (
        <p>กำลังโหลดข้อมูลสินค้า...</p>
      ) : (
        <div className="card">
          <form onSubmit={handleSell}>
            <div className="form-row">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
              >
                <option value="">-- เลือกสินค้า --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - ฿{product.price} (คงเหลือ {product.stock}{" "}
                    {product.unit})
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="จำนวน"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />

              <button type="submit" disabled={submitting}>
                {submitting ? "กำลังบันทึก..." : "ขาย"}
              </button>
            </div>
          </form>

          {/* แสดงยอดรวมอัตโนมัติก่อนกดยืนยัน */}
          {selectedProduct && parsedQuantity > 0 && (
            <p>
              ยอดรวม: <strong>{totalPrice} บาท</strong> (
              {selectedProduct.price} x {parsedQuantity})
            </p>
          )}
        </div>
      )}
    </div>
  );
}
