const transactionForm = document.getElementById('transactionForm');
const itemNameInput = document.getElementById('itemName');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('categorySelect');
const customCategoryRow = document.getElementById('customCategoryRow');
const customCategoryInput = document.getElementById('customCategory');
const transactionList = document.getElementById('transactionList');
const balanceDisplay = document.getElementById('balanceDisplay');
const listCount = document.getElementById('listCount');
const sortSelect = document.getElementById('sortSelect');
const formStatus = document.getElementById('formStatus');
const themeToggle = document.getElementById('themeToggle');
const submitButton = transactionForm.querySelector('button[type="submit"]');
const cancelEditButton = document.getElementById('cancelEditButton');
const formHeading = document.getElementById('formHeading');
const highlightLimit = 50;
const chartCanvas = document.getElementById('spendingChart');
let editingId = null;

const STORAGE_TRANSACTIONS = 'expenseTrackerTransactions';
const STORAGE_CATEGORIES = 'expenseTrackerCategories';
const STORAGE_THEME = 'expenseTrackerTheme';

const defaultCategories = ['Food', 'Transport', 'Fun'];
let categories = [...defaultCategories];
let transactions = [];
let spendingChart;

function loadFromStorage() {
  const storedTransactions = localStorage.getItem(STORAGE_TRANSACTIONS);
  const storedCategories = localStorage.getItem(STORAGE_CATEGORIES);
  const storedTheme = localStorage.getItem(STORAGE_THEME);

  if (storedTransactions) {
    try {
      transactions = JSON.parse(storedTransactions) || [];
    } catch (error) {
      transactions = [];
    }
  }

  if (storedCategories) {
    try {
      categories = JSON.parse(storedCategories) || [...defaultCategories];
    } catch (error) {
      categories = [...defaultCategories];
    }
  }

  if (storedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
    themeToggle.textContent = '☀️';
  } else {
    document.body.classList.add('light-mode');
    document.body.classList.remove('dark-mode');
    themeToggle.textContent = '🌙';
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_TRANSACTIONS, JSON.stringify(transactions));
  localStorage.setItem(STORAGE_CATEGORIES, JSON.stringify(categories));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function updateCategoryOptions() {
  const currentValue = categorySelect.value;
  categorySelect.innerHTML = '<option value="" selected disabled>Select category</option>';
  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
  const customOption = document.createElement('option');
  customOption.value = 'custom';
  customOption.textContent = 'Add custom category...';
  categorySelect.appendChild(customOption);
  if (categories.includes(currentValue)) {
    categorySelect.value = currentValue;
  }
}

function updateBalance() {
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  balanceDisplay.textContent = formatCurrency(total);
}

function getSortedTransactions() {
  const mode = sortSelect.value;
  return [...transactions].sort((a, b) => {
    if (mode === 'amount') {
      return b.amount - a.amount;
    }
    if (mode === 'category') {
      return a.category.localeCompare(b.category);
    }
    return b.date - a.date;
  });
}

function renderTransactions() {
  transactionList.innerHTML = '';
  const sorted = getSortedTransactions();
  listCount.textContent = `${sorted.length} item${sorted.length === 1 ? '' : 's'}`;

  if (!sorted.length) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'transaction-item';
    emptyCard.textContent = 'No transactions yet. Add your first expense above.';
    transactionList.appendChild(emptyCard);
    return;
  }

  sorted.forEach((transaction) => {
    const card = document.createElement('div');
    card.className = 'transaction-item';

    const main = document.createElement('div');
    main.className = 'transaction-main';

    const name = document.createElement('p');
    name.className = 'transaction-name';
    name.textContent = transaction.name;

    const meta = document.createElement('p');
    meta.className = 'transaction-meta';
    meta.textContent = `${transaction.category} • ${new Date(transaction.date).toLocaleDateString()}`;

    main.append(name, meta);

    const amount = document.createElement('div');
    amount.className = 'transaction-amount';
    amount.textContent = formatCurrency(transaction.amount);
    if (transaction.amount > highlightLimit) {
      amount.classList.add('highlight');
    }

    const actions = document.createElement('div');
    actions.className = 'transaction-actions';

    const editButton = document.createElement('button');
    editButton.className = 'secondary-button';
    editButton.type = 'button';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => beginEditTransaction(transaction.id));

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.textContent = 'Delete';
    deleteButton.type = 'button';
    deleteButton.addEventListener('click', () => removeTransaction(transaction.id));

    actions.append(editButton, deleteButton);

    card.append(main, amount, actions);
    transactionList.appendChild(card);
  });
}

function createChart() {
  const totalsByCategory = transactions.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
    return acc;
  }, {});

  const labels = Object.keys(totalsByCategory);
  const data = labels.map((label) => totalsByCategory[label]);

  if (spendingChart) {
    spendingChart.data.labels = labels;
    spendingChart.data.datasets[0].data = data;
    spendingChart.update();
    return;
  }

  spendingChart = new Chart(chartCanvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map((label) => getCategoryColor(label)),
          borderColor: 'rgba(255,255,255,0.9)',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: 'var(--text-color)',
          },
        },
      },
    },
  });
}

function getCategoryColor(category) {
  const palette = {
    Food: '#f59e0b',
    Transport: '#2563eb',
    Fun: '#ec4899',
  };
  return palette[category] || '#34d399';
}

function updateChart() {
  createChart();
}

function removeTransaction(id) {
  transactions = transactions.filter((tx) => tx.id !== id);
  saveToStorage();
  refreshUI();
}

function showValidation(message) {
  formStatus.textContent = message;
  setTimeout(() => {
    formStatus.textContent = '';
  }, 3000);
}

function addTransaction(event) {
  event.preventDefault();

  const name = itemNameInput.value.trim();
  const amountValue = parseFloat(amountInput.value);
  const categoryValue = categorySelect.value;
  const customCategoryValue = customCategoryInput.value.trim();

  if (!name) {
    showValidation('Please enter an item name.');
    return;
  }

  if (!amountValue || amountValue <= 0) {
    showValidation('Please enter a valid amount.');
    return;
  }

  if (!categoryValue) {
    showValidation('Please choose a category.');
    return;
  }

  let category = categoryValue;
  if (categoryValue === 'custom') {
    if (!customCategoryValue) {
      showValidation('Enter a custom category name.');
      return;
    }
    category = customCategoryValue;
    if (!categories.includes(category)) {
      categories.push(category);
    }
  }

  const transaction = {
    id: Date.now().toString(),
    name,
    amount: amountValue,
    category,
    date: Date.now(),
  };

  if (editingId) {
    transactions = transactions.map((tx) =>
      tx.id === editingId ? { ...tx, name, amount: amountValue, category, date: tx.date } : tx
    );
    editingId = null;
    submitButton.textContent = 'Add Transaction';
    formHeading.textContent = 'Add Transaction';
    cancelEditButton.classList.add('hidden');
  } else {
    transactions.push(transaction);
  }

  saveToStorage();
  updateCategoryOptions();
  transactionForm.reset();
  customCategoryRow.classList.add('hidden');
  refreshUI();
}

function beginEditTransaction(id) {
  const transaction = transactions.find((tx) => tx.id === id);
  if (!transaction) return;

  editingId = id;
  itemNameInput.value = transaction.name;
  amountInput.value = transaction.amount;

  if (!categories.includes(transaction.category)) {
    categories.push(transaction.category);
    updateCategoryOptions();
  }

  if (categories.includes(transaction.category)) {
    categorySelect.value = transaction.category;
    customCategoryRow.classList.add('hidden');
  } else {
    categorySelect.value = 'custom';
    customCategoryRow.classList.remove('hidden');
    customCategoryInput.value = transaction.category;
  }

  submitButton.textContent = 'Update Transaction';
  formHeading.textContent = 'Edit Transaction';
  cancelEditButton.classList.remove('hidden');
}

function cancelEdit() {
  editingId = null;
  transactionForm.reset();
  customCategoryRow.classList.add('hidden');
  submitButton.textContent = 'Add Transaction';
  formHeading.textContent = 'Add Transaction';
  cancelEditButton.classList.add('hidden');
}

function refreshUI() {
  updateBalance();
  renderTransactions();
  updateChart();
}

function handleCategoryChange() {
  if (categorySelect.value === 'custom') {
    customCategoryRow.classList.remove('hidden');
    customCategoryInput.focus();
  } else {
    customCategoryRow.classList.add('hidden');
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('light-mode', !isDark);
  themeToggle.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem(STORAGE_THEME, isDark ? 'dark' : 'light');
}

transactionForm.addEventListener('submit', addTransaction);
categorySelect.addEventListener('change', handleCategoryChange);
sortSelect.addEventListener('change', renderTransactions);
themeToggle.addEventListener('click', toggleTheme);
cancelEditButton.addEventListener('click', cancelEdit);

loadFromStorage();
updateCategoryOptions();
refreshUI();

