import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hotel } from "lucide-react";
import supabase from "@/lib/supabase";
import { createJournalEntryFromSubAccount } from "@/lib/journalEntries";

export default function HotelPage() {
  const [formData, setFormData] = useState({
    kode_transaksi: "",
    tanggal: "",
    nama_hotel: "",
    lokasi: "",
    tanggal_checkin: "",
    tanggal_checkout: "",
    jumlah_kamar: "1",
    harga_jual: "",
    harga_basic: "",
    fee_sales: "",
    profit: "",
    total_malam: "1",
    keterangan: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // No need to calculate total anymore
      if (
        name === "harga_jual" ||
        name === "total_malam" ||
        name === "jumlah_kamar"
      ) {
        // Calculation removed
      }

      // Calculate profit
      if (
        name === "harga_jual" ||
        name === "harga_basic" ||
        name === "fee_sales"
      ) {
        const hargaJual = parseFloat(newData.harga_jual) || 0;
        const hargaBasic = parseFloat(newData.harga_basic) || 0;
        const feeSales = parseFloat(newData.fee_sales) || 0;
        newData.profit = Math.max(
          0,
          hargaJual - hargaBasic - feeSales,
        ).toString();
      }

      // Calculate total nights if check-in and check-out dates are set
      if (
        (name === "tanggal_checkin" || name === "tanggal_checkout") &&
        newData.tanggal_checkin &&
        newData.tanggal_checkout
      ) {
        const checkin = new Date(newData.tanggal_checkin);
        const checkout = new Date(newData.tanggal_checkout);
        if (checkout > checkin) {
          const diffTime = Math.abs(checkout.getTime() - checkin.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          newData.total_malam = diffDays.toString();

          // No need to update total anymore
        }
      }

      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Save transaction data to database
      const transactionData = {
        kode_transaksi: formData.kode_transaksi,
        tanggal: formData.tanggal,
        nama_hotel: formData.nama_hotel,
        lokasi: formData.lokasi,
        tanggal_checkin: formData.tanggal_checkin,
        tanggal_checkout: formData.tanggal_checkout,
        jumlah_kamar: parseInt(formData.jumlah_kamar) || 1,
        harga_jual: parseFloat(formData.harga_jual) || 0,
        harga_basic: parseFloat(formData.harga_basic) || 0,
        fee_sales: parseFloat(formData.fee_sales) || 0,
        profit: parseFloat(formData.profit) || 0,
        total_malam: parseInt(formData.total_malam) || 1,
        keterangan: formData.keterangan,
      };

      console.log("Form data submitted:", transactionData);

      // Example of how you might save this to Supabase
      // Uncomment and modify as needed for your schema
      /*
      const { error } = await supabase
        .from('hotel_transactions')
        .insert([transactionData]);
      
      if (error) throw error;
      */

      // Create journal entry automatically
      // Fetch the account IDs for Hotel transactions
      // First, get the Pendapatan Hotel account ID (assuming account code 4102)
      const { data: pendapatanHotelAccount, error: pendapatanError } =
        await supabase
          .from("chart_of_accounts")
          .select("id")
          .eq("account_code", "4102") // Pendapatan Hotel
          .single();

      if (pendapatanError)
        throw new Error("Akun Pendapatan Hotel tidak ditemukan");
      const pendapatanHotelAccountId = pendapatanHotelAccount.id;

      // Get Kas account (assuming account code 1101)
      const { data: kasAccount, error: kasError } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("account_code", "1101") // Kas
        .single();

      if (kasError) throw new Error("Akun Kas tidak ditemukan");
      const kasAccountId = kasAccount.id;

      const totalAmount =
        transactionData.harga_jual *
        transactionData.jumlah_kamar *
        transactionData.total_malam;

      const journalResult = await createJournalEntryFromSubAccount({
        date: transactionData.tanggal,
        description: `Penjualan Hotel - ${transactionData.nama_hotel} (${transactionData.lokasi})`,
        accountDebit: kasAccountId, // Kas/Bank (Debit)
        accountCredit: pendapatanHotelAccountId, // Pendapatan Hotel (Credit)
        amount: totalAmount,
        reference: transactionData.kode_transaksi,
      });

      if (!journalResult.success) {
        throw new Error(journalResult.error || "Gagal membuat jurnal entri");
      }

      setSuccess(true);
      // Reset form after successful submission
      setFormData({
        kode_transaksi: "",
        tanggal: "",
        nama_hotel: "",
        lokasi: "",
        tanggal_checkin: "",
        tanggal_checkout: "",
        jumlah_kamar: "1",
        harga_jual: "",
        harga_basic: "",
        fee_sales: "",
        profit: "",
        total_malam: "1",
        keterangan: "",
      });
    } catch (err: any) {
      console.error("Error submitting form:", err);
      setError(err.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeItem="sub-account-hotel" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Hotel className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Penjualan Hotel</h1>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-6">Form Transaksi Hotel</h2>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-6">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-100 text-green-800 p-3 rounded-md text-sm mb-6">
                Data berhasil disimpan!
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kode_transaksi">Kode Transaksi</Label>
                  <Input
                    id="kode_transaksi"
                    name="kode_transaksi"
                    value={formData.kode_transaksi}
                    onChange={handleChange}
                    placeholder="HTL-001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal">Tanggal Transaksi</Label>
                  <Input
                    id="tanggal"
                    name="tanggal"
                    type="date"
                    value={formData.tanggal}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nama_hotel">Nama Hotel</Label>
                  <Input
                    id="nama_hotel"
                    name="nama_hotel"
                    value={formData.nama_hotel}
                    onChange={handleChange}
                    placeholder="Grand Hyatt"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lokasi">Lokasi</Label>
                  <Input
                    id="lokasi"
                    name="lokasi"
                    value={formData.lokasi}
                    onChange={handleChange}
                    placeholder="Jakarta"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal_checkin">Tanggal Check-in</Label>
                  <Input
                    id="tanggal_checkin"
                    name="tanggal_checkin"
                    type="date"
                    value={formData.tanggal_checkin}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal_checkout">Tanggal Check-out</Label>
                  <Input
                    id="tanggal_checkout"
                    name="tanggal_checkout"
                    type="date"
                    value={formData.tanggal_checkout}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jumlah_kamar">Jumlah Kamar</Label>
                  <Input
                    id="jumlah_kamar"
                    name="jumlah_kamar"
                    type="number"
                    min="1"
                    value={formData.jumlah_kamar}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="harga_jual">Harga Jual per Malam (Rp)</Label>
                  <Input
                    id="harga_jual"
                    name="harga_jual"
                    type="number"
                    value={formData.harga_jual}
                    onChange={handleChange}
                    placeholder="1000000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="harga_basic">Harga Basic (Rp)</Label>
                  <Input
                    id="harga_basic"
                    name="harga_basic"
                    type="number"
                    value={formData.harga_basic}
                    onChange={handleChange}
                    placeholder="800000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fee_sales">Fee Sales (Rp)</Label>
                  <Input
                    id="fee_sales"
                    name="fee_sales"
                    type="number"
                    value={formData.fee_sales}
                    onChange={handleChange}
                    placeholder="50000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profit">Profit (Rp)</Label>
                  <Input
                    id="profit"
                    name="profit"
                    value={formData.profit}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_malam">Total Malam</Label>
                  <Input
                    id="total_malam"
                    name="total_malam"
                    type="number"
                    min="1"
                    value={formData.total_malam}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                <Input
                  id="keterangan"
                  name="keterangan"
                  value={formData.keterangan}
                  onChange={handleChange}
                  placeholder="Keterangan tambahan..."
                />
              </div>

              <div className="pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
