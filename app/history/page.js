"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function HistoryPage() {
  // รายการประวัติการขายทั้งหมด
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("sold_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setSales(data);
      setError("");
    }
    setLoading(false);
  }

  // คำนวณยอดขายรวมทั้งหมดจากทุกรายการ
  const totalRevenue = sales.reduce(
    (sum, sale) => sum + (sale.total_price || 0),
    0
  );

  // จัดรูปแบบวันเวลาให้อ่านง่าย
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div>
      <h1>ประวัติการขาย</h1>

      {error && <p style={{ color: "red" }}>เกิดข้อผิดพลาด: {error}</p>}

      {/* สรุปยอดขายรวมทั้งหมด */}
      <div className="card">
        <h3>ยอดขายรวมทั้งหมด: {totalRevenue.toLocaleString()} บาท</h3>
        <p>จำนวนรายการทั้งหมด: {sales.length} รายการ</p>
      </div>

      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : sales.length === 0 ? (
        <p>ยังไม่มีประวัติการขาย</p>
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
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>{formatDate(sale.sold_at)}</td>
                <td>{sale.product_name}</td>
                <td>{sale.quantity}</td>
                <td>{sale.total_price} บาท</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
