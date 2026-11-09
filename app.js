// Удаление сообщения из таблицы
document.getElementById('messages-body').addEventListener('click', (event) => {
  const button = event.target.closest('.icon-btn');
  if (!button) return;

  const row = button.closest('tr');
  const number = row.cells[0].textContent.trim();

  if (confirm(`Удалить сообщение ${number}?`)) {
    row.remove();
  }
});
