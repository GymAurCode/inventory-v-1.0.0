import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { 
  TrendingUp, 
  DollarSign, 
  Plus,
  Download,
  FileText,
  Calendar,
  Filter
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import moment from 'moment'

const Finance = () => {
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: 'monthly'
  })
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm()

  const { data: financeData } = useQuery(['finance-overview', filters], async () => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    const response = await axios.get(`/api/finance/overview?${params.toString()}`)
    return response.data
  })

  const { data: incomeData } = useQuery(['income', filters], async () => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    const response = await axios.get(`/api/finance/income?${params.toString()}`)
    return response.data
  })

  const { data: statsData } = useQuery(['finance-stats', filters], async () => {
    const params = new URLSearchParams()
    if (filters.period) params.append('period', filters.period)
    const response = await axios.get(`/api/finance/stats?${params.toString()}`)
    return response.data
  })

  const createIncome = useMutation(async (data) => {
    const response = await axios.post('/api/finance/income', data)
    return response.data
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('finance-overview')
      queryClient.invalidateQueries('income')
      toast.success('Income entry created successfully!')
      setShowModal(false)
      reset()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create income entry')
    }
  })

  const onSubmit = (data) => {
    createIncome.mutate(data)
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
      const response = await axios.get('/api/finance/export/pdf', {
        responseType: 'blob'
      });
      
      // Create a blob from the PDF data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `finance_report_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
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
      const response = await axios.get('/api/finance/export/excel', {
        responseType: 'blob'
      });
      
      // Create a blob from the Excel data
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `finance_report_${moment().format('YYYY-MM-DD_HH-mm')}.xlsx`;
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

  const stats = [
    {
      name: 'Total Income',
      value: formatCurrency(financeData?.income || 0),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900'
    },
    {
      name: 'Total Expenses',
      value: formatCurrency(financeData?.expenses || 0),
      icon: DollarSign,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900'
    },
    {
      name: 'Net Profit',
      value: formatCurrency(financeData?.netProfit || 0),
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900'
    },
    {
      name: 'Donation (2%)',
      value: formatCurrency(financeData?.donation || 0),
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finance</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your financial overview and income
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
              reset()
              setShowModal(true)
            }}
            className="btn-primary flex items-center"
          >
            <Plus size={16} className="mr-2" />
            Add Income
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <select
              value={filters.period}
              onChange={(e) => handleFilterChange('period', e.target.value)}
              className="input-field"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.name}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Partner Profit Split */}
      {financeData && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Partner Profit Split
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Partner A Share</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(financeData.partnerAShare)}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Partner B Share</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(financeData.partnerBShare)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Income Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Income Entries
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {incomeData?.income?.map((income) => (
                <tr key={income.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <TrendingUp className="h-5 w-5 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {income.description}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    +{formatCurrency(income.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      income.type === 'manual' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {income.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {income.product_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {moment(income.created_at).format('MMM DD, YYYY')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!incomeData?.income || incomeData.income.length === 0) && (
            <div className="text-center py-8">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No income entries</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by adding a new income entry.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Income Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Add New Income Entry
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <input
                    type="text"
                    {...register('description', { required: 'Description is required' })}
                    className="input-field mt-1"
                    placeholder="Enter income description"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Amount (Rs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('amount', { 
                      required: 'Amount is required',
                      min: { value: 0, message: 'Amount must be positive' }
                    })}
                    className="input-field mt-1"
                    placeholder="0.00"
                  />
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Type
                  </label>
                  <select
                    {...register('type', { required: 'Type is required' })}
                    className="input-field mt-1"
                  >
                    <option value="">Select type</option>
                    <option value="manual">Manual</option>
                    <option value="auto">Auto</option>
                  </select>
                  {errors.type && (
                    <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      reset()
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createIncome.isLoading}
                    className="btn-primary"
                  >
                    {createIncome.isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      'Create'
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

export default Finance 