
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { customerService } from '../../service/customerService';
import { Customer } from '../../types';
import { exportToCSV, processCSVImport, downloadCSVTemplate } from '../../service/dataService';
import { Button } from '../../components/ui/Button';
import { Edit2, Trash2, Search, Plus, Phone, Download, Import, FileText } from 'lucide-react';

export const CustomerListPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
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

  const handleExport = () => {
      exportToCSV(customers, 'Data_Pelanggan_ASPERDA');
  };

  const handleDownloadTemplate = () => {
      const headers = ['Full_Name', 'NIK', 'Phone', 'Address'];
      const example = ['Budi Santoso', '3578123456780001', '08123456789', 'Jl. Merdeka No 1, Jakarta'];
      downloadCSVTemplate(headers, 'Template_Import_Pelanggan', example);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setImporting(true);
          const file = e.target.files[0];
          
          processCSVImport(file, async (data) => {
              try {
                  let successCount = 0;
                  for (const row of data) {
                      if (row.Full_Name && row.Phone) {
                          await customerService.createCustomer({
                              full_name: row.Full_Name,
                              nik: row.NIK ? String(row.NIK) : '',
                              phone: row.Phone ? String(row.Phone) : '',
                              address: row.Address || '-',
                              is_blacklisted: false
                          });
                          successCount++;
                      }
                  }
                  alert(`Berhasil import ${successCount} data pelanggan.`);
                  fetchCustomers();
              } catch (err: any) {
                  alert("Import Gagal: " + err.message);
              } finally {
                  setImporting(false);
                  e.target.value = '';
              }
          });
      }
  };

  return (
    <div>
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Pelanggan</h1>
          <p className="text-slate-500 text-sm">Kelola database penyewa kendaraan Anda.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
            <button onClick={handleDownloadTemplate} className="px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-2">
                <FileText size={14}/> Template CSV
            </button>
            <label className="cursor-pointer px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-2">
                {importing ? <i className="fas fa-spinner fa-spin"></i> : <Import size={14}/>}
                <span>Import CSV</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
            <button onClick={handleExport} className="px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-2">
                <Download size={14}/> Export
            </button>
            <Link to="/dashboard/customers/new">
                <Button className="flex items-center gap-2 text-sm !w-auto">
                    <Plus size={16}/> Tambah Pelanggan
                </Button>
            </Link>
        </div>
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
              <Search size={16}/>
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
                      <a href={`https://wa.me/${customer.phone.replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                        <Phone size={14}/>
                        {customer.phone}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                      {customer.address || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {customer.is_blacklisted ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          BLACKLIST
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                          <Link 
                            to={`/dashboard/customers/edit/${customer.id}`}
                            className="text-slate-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-full"
                            title="Edit Pelanggan"
                          >
                            <Edit2 size={16} />
                          </Link>
                          <button 
                            onClick={() => handleDelete(customer.id, customer.full_name)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full"
                            title="Hapus Pelanggan"
                          >
                            <Trash2 size={16} />
                          </button>
                      </div>
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
