// Initialize Supabase client
const { createClient } = window.supabase;
const supabaseUrl = 'https://mltpljjibkmxncsmqtie.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sdHBsamppYmtteG5jc21xdGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwMzc5MjYsImV4cCI6MjA1NTYxMzkyNn0.5cHIVtarRAbwHy-hanBCz884_ZwkkvaIJ-P4pxQeCQo';
const supabase = createClient(supabaseUrl, supabaseKey);

// Store editor instances
let editors = {};

document.addEventListener('DOMContentLoaded', () => {
  const jobForm = document.getElementById('jobForm');
  if (jobForm) {
    jobForm.addEventListener('submit', handleJobSubmission);
  }

  // Initialize CKEditor instances
  initializeRichTextEditors();
});

function initializeRichTextEditors() {
  document.querySelectorAll('.html-editor').forEach((element) => {
    ClassicEditor.create(element, {
      toolbar: {
        items: [
          'heading',
          '|',
          'bold',
          'italic',
          '|',
          'bulletedList',
          'numberedList',
          '|',
          'link',
          '|',
          'undo',
          'redo',
        ],
      },
      removePlugins: ['Markdown', 'RestrictedEditingMode'],
      clipboard: {
        copyOnSelect: false,
      },
      paste: {
        keepFormatting: true,
        forcePlainText: false,
        allowedContent: 'p ul ol li strong em a[!href]',
      },
      pasteFromOffice: {
        keepFormatting: true,
        keepLists: true,
        keepBulletPoints: true,
      },
    })
      .then((editor) => {
        editors[element.id] = editor;

        // Add custom paste handling
        editor.editing.view.document.on('paste', (evt, data) => {
          if (!data.dataTransfer) return;

          const content =
            data.dataTransfer.getData('text/html') ||
            data.dataTransfer.getData('text/plain');

          if (content) {
            // Create a temporary div to clean the pasted content
            const temp = document.createElement('div');
            temp.innerHTML = content;

            // Process lists and bullet points
            const processedContent = processContent(temp);

            // Insert the processed content
            editor.model.change((writer) => {
              const viewFragment =
                editor.data.processor.toView(processedContent);
              const modelFragment = editor.data.toModel(viewFragment);
              editor.model.insertContent(modelFragment);
            });

            // Prevent default paste
            evt.stop();
          }
        });
      })
      .catch((error) => {
        console.error('Editor initialization error:', error);
      });
  });
}

// Helper function to process pasted content
function processContent(element) {
  // Convert common bullet points to proper list items
  const content = element.innerHTML;
  let processed = content
    // Convert bullet points to list items
    .replace(/([•\-\*]\s+)(.*?)(?=(?:[•\-\*]\s+|$))/g, '<li>$2</li>')
    // Convert numbered points to list items
    .replace(/(\d+[\.\)]\s+)(.*?)(?=(?:\d+[\.\)]\s+|$))/g, '<li>$2</li>')
    // Wrap consecutive list items in ul/ol tags
    .replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>')
    // Clean up any double-wrapped lists
    .replace(/<ul>\s*<ul>/g, '<ul>')
    .replace(/<\/ul>\s*<\/ul>/g, '</ul>')
    // Remove empty paragraphs
    .replace(/<p>\s*<\/p>/g, '')
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();

  return processed;
}

// Add this to handle direct paste events on the element
document.querySelectorAll('.html-editor').forEach((editor) => {
  editor.addEventListener('paste', (e) => {
    // Let CKEditor handle the paste event
    // The custom paste handling will be done through the CKEditor paste event
  });
});

function getFormField(fieldId) {
  // Check if it's a CKEditor field
  if (editors[fieldId]) {
    let content = editors[fieldId].getData().trim();

    // Clean up empty list items and extra spaces but preserve valid lists
    content = content
      .replace(/<li>&nbsp;<\/li>/g, '') // Remove empty list items with &nbsp;
      .replace(/<li>\s*<\/li>/g, '') // Remove empty list items
      .replace(/\n\s*\n/g, '\n') // Remove multiple blank lines
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .replace(/<p>&nbsp;<\/p>/g, ''); // Remove empty paragraphs

    // If the content is completely empty, return empty string
    if (content === '<ul></ul>' || content === '<ol></ol>' || content === '') {
      return '';
    }

    // Ensure lists are properly formatted
    content = content
      .replace(/<ul>\s*<\/ul>/g, '') // Remove empty lists
      .replace(/<ol>\s*<\/ol>/g, '') // Remove empty ordered lists
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .trim();

    return content;
  }

  // Regular form field handling remains the same
  const field = document.getElementById(fieldId);
  if (!field) {
    throw new Error(`Form field '${fieldId}' not found`);
  }

  // Handle multiple select
  if (field.multiple) {
    return Array.from(field.selectedOptions)
      .map((option) => option.value)
      .join(', ');
  }
  return field.value.trim();
}

async function handleJobSubmission(event) {
  event.preventDefault();

  // Show loading state
  const submitButton = event.target.querySelector('button[type="submit"]');
  if (!submitButton) {
    console.error('Submit button not found');
    return;
  }

  const originalButtonText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = 'Submitting...';

  try {
    // Get form data
    const formData = {
      title: getFormField('title'),
      company: getFormField('company'),
      location: getFormField('location'),
      description: getFormField('description'),
      jobType: getFormField('jobType'),
      experienceLevel: getFormField('experienceLevel'),
      source: getFormField('source'),
      companydetails: getFormField('companyDetails'),
      requirements: getFormField('requirements'),
      job_link: getFormField('jobLink'),
      posted_at: new Date().toISOString(),
    };

    // Log the formData for debugging
    console.log('Submitting form data:', formData);

    // Validate form data
    const validationError = validateFormData(formData);
    if (validationError) {
      throw new Error(validationError);
    }

    // Submit to Supabase
    const { data, error } = await supabase.from('jobs').insert([formData]);

    if (error) throw error;

    // Immediately redirect to index.html
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Error submitting job:', error);
    showAlert('danger', `Error posting job: ${error.message}`);
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonText;
  }
}

function validateFormData(formData) {
  if (!formData.title) return 'Job title is required';
  if (!formData.company) return 'Company name is required';
  if (!formData.location) return 'Location is required';
  if (!formData.description) return 'Job description is required';
  if (!formData.requirements) return 'Job requirements are required';
  if (!formData.jobType) return 'Job type is required';
  if (!formData.experienceLevel) return 'Experience level is required';
  if (!formData.job_link) return 'Job link is required or put N/A';

  // Additional HTML content validation
  if (formData.requirements.length > 50000)
    return 'Requirements content is too long';
  if (formData.companyDetails && formData.companyDetails.length > 50000)
    return 'Company details content is too long';

  return null;
}

function showAlert(type, message) {
  // Remove any existing alerts
  const existingAlert = document.querySelector('.alert');
  if (existingAlert) {
    existingAlert.remove();
  }

  // Create new alert
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.role = 'alert';
  alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

  // Insert alert before the form
  const form = document.getElementById('jobForm');
  if (form) {
    form.parentNode.insertBefore(alertDiv, form);
  }

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    alertDiv.classList.remove('show');
    setTimeout(() => alertDiv.remove(), 150);
  }, 5000);
}
