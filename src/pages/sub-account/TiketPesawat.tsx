import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane } from "lucide-react";
import supabase from "@/lib/supabase";
import { createJournalEntryFromSubAccount } from "@/lib/journalEntries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TiketPesawatPage() {
  const [formData, setFormData] = useState({
    kode_transaksi: "",
    tanggal: "",
    maskapai: "",
    rute: "",
    harga_jual: "",
    harga_basic: "",
    fee_sales: "",
    profit: "",
    jumlah_penumpang: "1",
    keterangan: "",
    payment_method: "cash", // Default to cash
    bank_account: "", // Only used for bank transfer or credit/debit card
  });

  const [bankAccounts, setBankAccounts] = useState<
    Array<{ id: string; account_code: string; account_name: string }>
  >([]);

  // Fetch bank accounts from chart_of_accounts
  useEffect(() => {
    const fetchBankAccounts = async () => {
      try {
        const { data, error } = await supabase
          .from("chart_of_accounts")
          .select("id, account_code, account_name")
          .or("account_code.eq.1111,account_code.eq.2222"); // Bank BCA and Bank Mandiri

        if (error) throw error;
        setBankAccounts(data || []);
      } catch (err) {
        console.error("Error fetching bank accounts:", err);
      }
    };

    fetchBankAccounts();
  }, []);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // No need to calculate total anymore
      if (name === "harga_jual" || name === "jumlah_penumpang") {
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

      return newData;
    });
  };

  // Handle select changes (payment method and bank account)
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => {
      // If changing payment method to cash, clear bank account
      if (name === "payment_method" && value === "cash") {
        return { ...prev, [name]: value, bank_account: "" };
      }
      return { ...prev, [name]: value };
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
        maskapai: formData.maskapai,
        rute: formData.rute,
        harga_jual: parseFloat(formData.harga_jual) || 0,
        harga_basic: parseFloat(formData.harga_basic) || 0,
        fee_sales: parseFloat(formData.fee_sales) || 0,
        profit: parseFloat(formData.profit) || 0,
        jumlah_penumpang: parseInt(formData.jumlah_penumpang) || 1,
        keterangan: formData.keterangan,
      };

      console.log("Form data submitted:", transactionData);

      // Example of how you might save this to Supabase
      // Uncomment and modify as needed for your schema
      /*
      const { error } = await supabase
        .from('tiket_pesawat_transactions')
        .insert([transactionData]);
      
      if (error) throw error;
      */

      // Create journal entry automatically
      // Fetch the account IDs for Tiket Pesawat transactions
      // First, get the Pendapatan Tiket account ID (assuming account code 4101)
      const { data: pendapatanTiketAccount, error: pendapatanError } =
        await supabase
          .from("chart_of_accounts")
          .select("id")
          .eq("account_code", "4101") // Pendapatan Tiket Pesawat
          .single();

      if (pendapatanError)
        throw new Error("Akun Pendapatan Tiket Pesawat tidak ditemukan");
      const pendapatanTiketAccountId = pendapatanTiketAccount.id;

      // Determine which account to debit based on payment method
      let debitAccountId;

      if (formData.payment_method === "cash") {
        // Get Kas account (assuming account code 1101)
        const { data: kasAccount, error: kasError } = await supabase
          .from("chart_of_accounts")
          .select("id")
          .eq("account_code", "1101") // Kas
          .single();

        if (kasError) throw new Error("Akun Kas tidak ditemukan");
        debitAccountId = kasAccount.id;
      }

      // If payment method is bank transfer or credit/debit card, use the selected bank account
      else if (
        (formData.payment_method === "bank_transfer" ||
          formData.payment_method === "credit_debit") &&
        formData.bank_account
      ) {
        debitAccountId = formData.bank_account;
      } else {
        throw new Error(
          "Metode pembayaran tidak valid atau akun bank tidak dipilih",
        );
      }

      const totalAmount =
        transactionData.harga_jual * transactionData.jumlah_penumpang;

      const journalResult = await createJournalEntryFromSubAccount({
        date: transactionData.tanggal,
        description: `Penjualan Tiket Pesawat - ${transactionData.maskapai} (${transactionData.rute}) - Pembayaran: ${formData.payment_method === "cash" ? "Tunai" : formData.payment_method === "bank_transfer" ? "Transfer Bank" : "Kartu Kredit/Debit"}`,
        accountDebit: debitAccountId, // Kas/Bank (Debit) based on payment method
        accountCredit: pendapatanTiketAccountId, // Pendapatan Tiket (Credit)
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
        maskapai: "",
        rute: "",
        harga_jual: "",
        harga_basic: "",
        fee_sales: "",
        profit: "",
        jumlah_penumpang: "1",
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
      <Sidebar activeItem="sub-account-tiket-pesawat" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Plane className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Penjualan Tiket Pesawat</h1>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-6">
              Form Transaksi Tiket Pesawat
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
                    placeholder="TKT-001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal">Tanggal</Label>
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
                  <Label htmlFor="maskapai">Maskapai</Label>
                  <Input
                    id="maskapai"
                    name="maskapai"
                    value={formData.maskapai}
                    onChange={handleChange}
                    placeholder="Garuda Indonesia"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rute">Rute</Label>
                  <Input
                    id="rute"
                    name="rute"
                    value={formData.rute}
                    onChange={handleChange}
                    placeholder="Jakarta - Bali"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="harga_jual">Harga Jual (Rp)</Label>
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
                  <Label htmlFor="jumlah_penumpang">Jumlah Penumpang</Label>
                  <Input
                    id="jumlah_penumpang"
                    name="jumlah_penumpang"
                    type="number"
                    min="1"
                    value={formData.jumlah_penumpang}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">Metode Pembayaran</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) =>
                      handleSelectChange("payment_method", value)
                    }
                  >
                    <SelectTrigger id="payment_method">
                      <SelectValue placeholder="Pilih metode pembayaran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Tunai</SelectItem>
                      <SelectItem value="bank_transfer">
                        Transfer Bank
                      </SelectItem>
                      <SelectItem value="credit_debit">
                        Kartu Kredit/Debit
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.payment_method === "bank_transfer" ||
                  formData.payment_method === "credit_debit") && (
                  <div className="space-y-2">
                    <Label htmlFor="bank_account">Pilih Bank</Label>
                    <Select
                      value={formData.bank_account}
                      onValueChange={(value) =>
                        handleSelectChange("bank_account", value)
                      }
                    >
                      <SelectTrigger id="bank_account">
                        <SelectValue placeholder="Pilih bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.account_name} ({bank.account_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
