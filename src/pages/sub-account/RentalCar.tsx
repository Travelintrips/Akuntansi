import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car } from "lucide-react";
import supabase from "@/lib/supabase";

export default function RentalCarPage() {
  const [formData, setFormData] = useState({
    kode_transaksi: "",
    tanggal: "",
    jenis_kendaraan: "",
    nomor_plat: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
    harga_jual: "",
    harga_basic: "",
    fee_sales: "",
    profit: "",
    jumlah_hari: "1",
    keterangan: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // Calculate days and profit when values change
      if (name === "harga_jual" || name === "jumlah_hari") {
        // No need to calculate total anymore
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

      // Calculate days if start and end dates are set
      if (
        (name === "tanggal_mulai" || name === "tanggal_selesai") &&
        newData.tanggal_mulai &&
        newData.tanggal_selesai
      ) {
        const startDate = new Date(newData.tanggal_mulai);
        const endDate = new Date(newData.tanggal_selesai);
        if (endDate >= startDate) {
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          newData.jumlah_hari = diffDays.toString();

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
      // Here you would typically save to your database
      // For demonstration, we'll just log the data and show success
      console.log("Form data submitted:", formData);

      // Example of how you might save this to Supabase
      // Uncomment and modify as needed for your schema
      /*
      const { error } = await supabase
        .from('rental_car_transactions')
        .insert([
          {
            kode_transaksi: formData.kode_transaksi,
            tanggal: formData.tanggal,
            jenis_kendaraan: formData.jenis_kendaraan,
            nomor_plat: formData.nomor_plat,
            tanggal_mulai: formData.tanggal_mulai,
            tanggal_selesai: formData.tanggal_selesai,
            harga_per_hari: parseFloat(formData.harga_per_hari),
            jumlah_hari: parseInt(formData.jumlah_hari),
            total: parseFloat(formData.total),
            keterangan: formData.keterangan,
          }
        ]);
      
      if (error) throw error;
      */

      setSuccess(true);
      // Reset form after successful submission
      setFormData({
        kode_transaksi: "",
        tanggal: "",
        jenis_kendaraan: "",
        nomor_plat: "",
        tanggal_mulai: "",
        tanggal_selesai: "",
        harga_jual: "",
        harga_basic: "",
        fee_sales: "",
        profit: "",
        jumlah_hari: "1",
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
      <Sidebar activeItem="sub-account-rental-car" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Car className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Rental Mobil</h1>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-6">
              Form Transaksi Rental Mobil
            </h2>

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
                    placeholder="RC-001"
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
                  <Label htmlFor="jenis_kendaraan">Jenis Kendaraan</Label>
                  <Input
                    id="jenis_kendaraan"
                    name="jenis_kendaraan"
                    value={formData.jenis_kendaraan}
                    onChange={handleChange}
                    placeholder="Toyota Avanza"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nomor_plat">Nomor Plat</Label>
                  <Input
                    id="nomor_plat"
                    name="nomor_plat"
                    value={formData.nomor_plat}
                    onChange={handleChange}
                    placeholder="B 1234 ABC"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal_mulai">Tanggal Mulai</Label>
                  <Input
                    id="tanggal_mulai"
                    name="tanggal_mulai"
                    type="date"
                    value={formData.tanggal_mulai}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal_selesai">Tanggal Selesai</Label>
                  <Input
                    id="tanggal_selesai"
                    name="tanggal_selesai"
                    type="date"
                    value={formData.tanggal_selesai}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="harga_jual">Harga Jual per Hari (Rp)</Label>
                  <Input
                    id="harga_jual"
                    name="harga_jual"
                    type="number"
                    value={formData.harga_jual}
                    onChange={handleChange}
                    placeholder="500000"
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
                    placeholder="400000"
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
                    placeholder="25000"
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
                  <Label htmlFor="jumlah_hari">Jumlah Hari</Label>
                  <Input
                    id="jumlah_hari"
                    name="jumlah_hari"
                    type="number"
                    min="1"
                    value={formData.jumlah_hari}
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
