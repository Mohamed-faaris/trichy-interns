const form = document.getElementById('form');
const message = document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    number: document.getElementById('number').value,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  message.className = 'message';
  message.textContent = '';

  try {
    const response = await fetch('/api/forms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (data.success) {
      message.textContent = data.message;
      message.classList.add('success');
      form.reset();
    } else {
      message.textContent = data.message || 'Something went wrong';
      message.classList.add('error');
    }
  } catch (error) {
    message.textContent = 'Failed to submit form. Please try again.';
    message.classList.add('error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
  }
});
