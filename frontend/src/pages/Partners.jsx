import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users,
  Download,
  FileText,
  Filter
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import moment from 'moment'

const Partners = () => {
  const [showModal, setShowModal] = useState(false)
  const [editingPartner, setEditingPartner] = useState(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: ''
  })
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm()

  const { data: partnersData, isLoading } = useQuery('partners', async () => {
    const response = await axios.get('/api/partners')
    return response.data
  })

  const { data: profitSharingData } = useQuery(['partners-profit-sharing', filters], async () => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    const response = await axios.get(`/api/partners/profit-sharing?${params.toString()}`)
    return response.data
  })

  const createPartner = useMutation(async (data) => {
    const response = await axios.post('/api/partners', data)
    return response.data
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('partners')
      queryClient.invalidateQueries('partners-profit-sharing')
      toast.success('Partner created successfully!')
      setShowModal(false)
      reset()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create partner')
    }
  })

  const updatePartner = useMutation(async ({ id, data }) => {
    const response = await axios.put(`/api/partners/${id}`, data)
    return response.data
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('partners')
      queryClient.invalidateQueries('partners-profit-sharing')
      toast.success('Partner updated successfully!')
      setShowModal(false)
      setEditingPartner(null)
      reset()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update partner')
    }
  })

  const deletePartner = useMutation(async (id) => {
    await axios.delete(`/api/partners/${id}`)
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('partners')
      queryClient.invalidateQueries('partners-profit-sharing')
      toast.success('Partner deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete partner')
    }
  })

  const onSubmit = (data) => {
    if (editingPartner) {
      updatePartner.mutate({ id: editingPartner.id, data })
    } else {
      createPartner.mutate(data)
    }
  }

  const handleEdit = (partner) => {
    setEditingPartner(partner)
    reset({
      name: partner.name,
      share_percentage: partner.share_percentage
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this partner?')) {
      deletePartner.mutate(id)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount || 0)
  }

  const exportToPDF = async () => {
    try {
      const response = await axios.get('/api/partners/export/pdf', {
        responseType: 'blob'
      });
      
      // Create a blob from the PDF data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `partners_report_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  }

  const exportToExcel = async () => {
    try {
      const response = await axios.get('/api/partners/export/excel', {
        responseType: 'blob'
      });
      
      // Create a blob from the Excel data
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `partners_report_${moment().format('YYYY-MM-DD_HH-mm')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel file exported successfully!');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel file');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Partners</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage partners and profit sharing
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={exportToPDF}
            className="btn-secondary flex items-center"
          >
            <FileText size={16} className="mr-2" />
            PDF
          </button>
          <button
            onClick={exportToExcel}
            className="btn-secondary flex items-center"
          >
            <Download size={16} className="mr-2" />
            Excel
          </button>
          <button
            onClick={() => {
              setEditingPartner(null)
              reset()
              setShowModal(true)
            }}
            className="btn-primary flex items-center"
          >
            <Plus size={16} className="mr-2" />
            Add Partner
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="input-field"
              placeholder="Start Date"
            />

            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="input-field"
              placeholder="End Date"
            />
          </div>
        </div>
      </div>

      {/* Profit Sharing Overview */}
      {profitSharingData && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Profit Sharing Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Income</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(profitSharingData.financials.income)}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(profitSharingData.financials.expenses)}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Net Profit</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(profitSharingData.financials.netProfit)}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Donation (2%)</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(profitSharingData.financials.donation)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Partners Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Partners
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Share Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Share Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date Added
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {partnersData?.partners?.map((partner) => {
                const shareAmount = profitSharingData?.partners?.find(
                  p => p.id === partner.id
                )?.share_amount || 0

                return (
                  <tr key={partner.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="h-5 w-5 text-gray-400 mr-2" />
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {partner.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {partner.share_percentage}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {formatCurrency(shareAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {moment(partner.created_at).format('MMM DD, YYYY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(partner)}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-3"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(partner.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(!partnersData?.partners || partnersData.partners.length === 0) && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No partners</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by adding a new partner.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {editingPartner ? 'Edit Partner' : 'Add New Partner'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Partner Name
                  </label>
                  <input
                    type="text"
                    {...register('name', { required: 'Partner name is required' })}
                    className="input-field mt-1"
                    placeholder="Enter partner name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Share Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('share_percentage', { 
                      required: 'Share percentage is required',
                      min: { value: 0, message: 'Share percentage must be positive' },
                      max: { value: 100, message: 'Share percentage cannot exceed 100%' }
                    })}
                    className="input-field mt-1"
                    placeholder="50.00"
                  />
                  {errors.share_percentage && (
                    <p className="mt-1 text-sm text-red-600">{errors.share_percentage.message}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingPartner(null)
                      reset()
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createPartner.isLoading || updatePartner.isLoading}
                    className="btn-primary"
                  >
                    {createPartner.isLoading || updatePartner.isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      editingPartner ? 'Update' : 'Create'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Partners 