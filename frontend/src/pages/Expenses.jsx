import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign,
  Download,
  FileText,
  Filter
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import moment from 'moment'

const Expenses = () => {
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [filters, setFilters] = useState({
    type: '',
    category: '',
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

  const { data: expensesData, isLoading } = useQuery(['expenses', filters], async () => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value)
    })
    const response = await axios.get(`/api/expenses?${params.toString()}`)
    return response.data
  })

  const createExpense = useMutation(async (data) => {
    const response = await axios.post('/api/expenses', data)
    return response.data
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('expenses')
      queryClient.invalidateQueries('finance-overview')
      toast.success('Expense created successfully!')
      setShowModal(false)
      reset()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create expense')
    }
  })

  const updateExpense = useMutation(async ({ id, data }) => {
    const response = await axios.put(`/api/expenses/${id}`, data)
    return response.data
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('expenses')
      queryClient.invalidateQueries('finance-overview')
      toast.success('Expense updated successfully!')
      setShowModal(false)
      setEditingExpense(null)
      reset()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update expense')
    }
  })

  const deleteExpense = useMutation(async (id) => {
    await axios.delete(`/api/expenses/${id}`)
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('expenses')
      queryClient.invalidateQueries('finance-overview')
      toast.success('Expense deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete expense')
    }
  })

  const onSubmit = (data) => {
    if (editingExpense) {
      updateExpense.mutate({ id: editingExpense.id, data })
    } else {
      createExpense.mutate(data)
    }
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    reset({
      description: expense.description,
      amount: expense.amount,
      type: expense.type,
      category: expense.category || ''
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      deleteExpense.mutate(id)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      type: '',
      category: '',
      startDate: '',
      endDate: ''
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount || 0)
  }

  const exportToPDF = async () => {
    try {
      const response = await axios.get('/api/expenses/export/pdf', {
        responseType: 'blob'
      });
      
      // Create a blob from the PDF data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `expenses_export_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
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
      const response = await axios.get('/api/expenses/export/excel', {
        responseType: 'blob'
      });
      
      // Create a blob from the Excel data
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `expenses_export_${moment().format('YYYY-MM-DD_HH-mm')}.xlsx`;
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage your business expenses
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
              setEditingExpense(null)
              reset()
              setShowModal(true)
            }}
            className="btn-primary flex items-center"
          >
            <Plus size={16} className="mr-2" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="input-field"
            >
              <option value="">All Types</option>
              <option value="manual">Manual</option>
              <option value="auto">Auto</option>
            </select>

            <input
              type="text"
              placeholder="Category"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="input-field"
            />

            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="input-field"
            />

            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="input-field"
            />
          </div>
          <button
            onClick={clearFilters}
            className="btn-secondary"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card">
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
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {expensesData?.expenses?.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {expense.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      expense.type === 'manual' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {expense.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {expense.category || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {expense.product_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {moment(expense.created_at).format('MMM DD, YYYY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-3"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!expensesData?.expenses || expensesData.expenses.length === 0) && (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No expenses</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by adding a new expense.
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
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
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
                    placeholder="Enter expense description"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category (Optional)
                  </label>
                  <input
                    type="text"
                    {...register('category')}
                    className="input-field mt-1"
                    placeholder="e.g., Rent, Fuel, Bills"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingExpense(null)
                      reset()
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createExpense.isLoading || updateExpense.isLoading}
                    className="btn-primary"
                  >
                    {createExpense.isLoading || updateExpense.isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      editingExpense ? 'Update' : 'Create'
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

export default Expenses 