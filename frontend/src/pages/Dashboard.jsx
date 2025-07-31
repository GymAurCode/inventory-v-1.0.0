import { useQuery } from 'react-query'
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  Users,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import axios from 'axios'
import moment from 'moment'

const Dashboard = () => {
  const { data: financeData } = useQuery('finance-overview', async () => {
    const response = await axios.get('/api/finance/overview')
    return response.data
  })

  const { data: productsData } = useQuery('products', async () => {
    const response = await axios.get('/api/products')
    return response.data
  })

  const { data: expensesData } = useQuery('expenses', async () => {
    const response = await axios.get('/api/expenses')
    return response.data
  })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount || 0)
  }

  const stats = [
    {
      name: 'Total Products',
      value: productsData?.products?.length || 0,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900'
    },
    {
      name: 'Total Income',
      value: formatCurrency(financeData?.income || 0),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Total Expenses',
      value: formatCurrency(financeData?.expenses || 0),
      icon: DollarSign,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900',
      change: '+8%',
      changeType: 'negative'
    },
    {
      name: 'Net Profit',
      value: formatCurrency(financeData?.netProfit || 0),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
      change: '+15%',
      changeType: 'positive'
    }
  ]

  const recentProducts = productsData?.products?.slice(0, 5) || []
  const recentExpenses = expensesData?.expenses?.slice(0, 5) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome back! Here's what's happening with your business.
        </p>
      </div>

      {/* Stats Grid */}
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
                {stat.change && (
                  <div className="flex items-center mt-1">
                    {stat.changeType === 'positive' ? (
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm ml-1 ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Products */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Products
          </h3>
          <div className="space-y-3">
            {recentProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Qty: {product.quantity} | Cost: {formatCurrency(product.cost_price)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(product.selling_price)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {moment(product.created_at).format('MMM DD, YYYY')}
                  </p>
                </div>
              </div>
            ))}
            {recentProducts.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No products found
              </p>
            )}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Expenses
          </h3>
          <div className="space-y-3">
            {recentExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{expense.description}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {expense.type} • {expense.category || 'No category'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-red-600">
                    {formatCurrency(expense.amount)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {moment(expense.created_at).format('MMM DD, YYYY')}
                  </p>
                </div>
              </div>
            ))}
            {recentExpenses.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No expenses found
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      {financeData && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Financial Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Donation (2%)</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(financeData.donation)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Partner A Share</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(financeData.partnerAShare)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Partner B Share</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(financeData.partnerBShare)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard 