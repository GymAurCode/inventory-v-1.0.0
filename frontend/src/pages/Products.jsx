import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package,
  Download,
  FileText
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import moment from 'moment'

const Products = () => {
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm()

  const { data: productsData, isLoading } = useQuery('products', async () => {
    const response = await axios.get('/api/products')
    return response.data
  })

  const createProduct = useMutation(async (data) => {
    const response = await axios.post('/api/products', data)
    return response.data
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('products')
      queryClient.invalidateQueries('finance-overview')
      queryClient.invalidateQueries('partners')
      queryClient.invalidateQueries('partners-profit-sharing')
      queryClient.invalidateQueries('expenses')
      toast.success('Product created successfully!')
      setShowModal(false)
      reset()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create product')
    }
  })

  const updateProduct = useMutation(async ({ id, data }) => {
    const response = await axios.put(`/api/products/${id}`, data)
    return response.data
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('products')
      queryClient.invalidateQueries('finance-overview')
      queryClient.invalidateQueries('partners')
      queryClient.invalidateQueries('partners-profit-sharing')
      queryClient.invalidateQueries('expenses')
      toast.success('Product updated successfully!')
      setShowModal(false)
      setEditingProduct(null)
      reset()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update product')
    }
  })

  const deleteProduct = useMutation(async (id) => {
    await axios.delete(`/api/products/${id}`)
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('products')
      queryClient.invalidateQueries('finance-overview')
      queryClient.invalidateQueries('partners')
      queryClient.invalidateQueries('partners-profit-sharing')
      queryClient.invalidateQueries('expenses')
      toast.success('Product deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete product')
    }
  })

  const onSubmit = (data) => {
    if (editingProduct) {
      updateProduct.mutate({ id: editingProduct.id, data })
    } else {
      createProduct.mutate(data)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    reset({
      name: product.name,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      quantity: product.quantity
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProduct.mutate(id)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount || 0)
  }

  const exportToPDF = async () => {
    try {
      const response = await axios.get('/api/products/export/pdf', {
        responseType: 'blob'
      });
      
      // Create a blob from the PDF data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `products_export_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
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
      const response = await axios.get('/api/products/export/excel', {
        responseType: 'blob'
      });
      
      // Create a blob from the Excel data
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `products_export_${moment().format('YYYY-MM-DD_HH-mm')}.xlsx`;
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your inventory and product information
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
              setEditingProduct(null)
              reset()
              setShowModal(true)
            }}
            className="btn-primary flex items-center"
          >
            <Plus size={16} className="mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Cost Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Selling Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Revenue
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
              {productsData?.products?.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {product.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatCurrency(product.cost_price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatCurrency(product.selling_price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {product.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    {formatCurrency(product.total_cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {formatCurrency(product.total_revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {moment(product.created_at).format('MMM DD, YYYY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-3"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!productsData?.products || productsData.products.length === 0) && (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No products</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new product.
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
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Product Name
                  </label>
                  <input
                    type="text"
                    {...register('name', { required: 'Product name is required' })}
                    className="input-field mt-1"
                    placeholder="Enter product name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cost Price (Rs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('cost_price', { 
                      required: 'Cost price is required',
                      min: { value: 0, message: 'Cost price must be positive' }
                    })}
                    className="input-field mt-1"
                    placeholder="0.00"
                  />
                  {errors.cost_price && (
                    <p className="mt-1 text-sm text-red-600">{errors.cost_price.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selling Price (Rs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('selling_price', { 
                      required: 'Selling price is required',
                      min: { value: 0, message: 'Selling price must be positive' }
                    })}
                    className="input-field mt-1"
                    placeholder="0.00"
                  />
                  {errors.selling_price && (
                    <p className="mt-1 text-sm text-red-600">{errors.selling_price.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quantity
                  </label>
                  <input
                    type="number"
                    {...register('quantity', { 
                      required: 'Quantity is required',
                      min: { value: 0, message: 'Quantity must be positive' }
                    })}
                    className="input-field mt-1"
                    placeholder="0"
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingProduct(null)
                      reset()
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createProduct.isLoading || updateProduct.isLoading}
                    className="btn-primary"
                  >
                    {createProduct.isLoading || updateProduct.isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      editingProduct ? 'Update' : 'Create'
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

export default Products 