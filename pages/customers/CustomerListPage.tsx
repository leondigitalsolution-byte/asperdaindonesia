import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { customerService } from '../../service/customerService';
import { Customer } from '../../types';
import { Button } from '../../components/ui/Button';

export const CustomerListPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const lowerTerm = searchTerm.toLowerCase();
      const filtered = customers.filter(c => 
        c.full_name.toLowerCase().includes(lowerTerm) || 
        c.nik.includes(lowerTerm)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await customerService.getCustomers();
      setCustomers(data);
      setFilteredCustomers(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus pelanggan: ${name}?`)) {
      try {
        await customerService.deleteCustomer(id);
        fetchCustomers();
      } catch (err: any) {
        alert("Gagal menghapus: " + err.message);
      }
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Pelanggan</h1>
          <p className="text-slate-500 text-sm">Kelola database penyewa kendaraan Anda.</p>
        </div>
        <Link to="/dashboard/customers/new">
          <Button>
            <i className="fas fa-plus mr-2"></i> Tambah Pelanggan
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
          <p className="text-red-700 font-medium mb-2"><i className="fas fa-exclamation-triangle mr-2"></i> Gagal memuat data</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="max-w-md relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <i className="fas fa-search"></i>
            </div>
            <input
              type="text"
              placeholder="Cari Nama atau NIK..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">NIK</th>
                <th className="px-6 py-4">No. Telepon</th>
                <th className="px-6 py-4">Alamat</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr>
                   <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                     <i className="fas fa-spinner fa-spin mr-2"></i> Memuat data...
                   </td>
                 </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    {searchTerm ? `Tidak ditemukan pelanggan dengan kata kunci "${searchTerm}"` : "Belum ada data pelanggan."}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {customer.full_name}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono">
                      {customer.nik}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <a href={`https://wa.me/${customer.phone.replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        <i className="fab fa-whatsapp mr-1"></i>
                        {customer.phone}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                      {customer.address || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {customer.is_blacklisted ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          BLACKLIST
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(customer.id, customer.full_name)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-2"
                        title="Hapus Pelanggan"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};