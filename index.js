const { Plugin } = require('@saltcorn/data/models/plugin');
const { Field } = require('@saltcorn/data/models/field');
const axios = require('axios');

// Funkcja do połączenia z Nextcloud
async function createNextcloudFolder(apiUrl, username, password, folderName) {
  try {
    const response = await axios.request({
      method: 'MKCOL',
      url: `${apiUrl}/remote.php/dav/files/${username}/${folderName}/`,
      auth: { username, password },
    });
    return response.status === 201 || response.status === 207;
  } catch (error) {
    console.error('Błąd tworzenia folderu:', error.response?.data || error.message);
    return false;
  }
}

// Funkcja do pobierania plików z Nextcloud
async function listNextcloudFiles(apiUrl, username, password, folderName) {
  try {
    const response = await axios.request({
      method: 'PROPFIND',
      url: `${apiUrl}/remote.php/dav/files/${username}/${folderName}/`,
      auth: { username, password },
    });
    return response.data;
  } catch (error) {
    console.error('Błąd pobierania plików:', error.response?.data || error.message);
    return [];
  }
}

// Funkcja do usuwania folderu
async function deleteNextcloudFolder(apiUrl, username, password, folderName) {
  try {
    await axios.request({
      method: 'DELETE',
      url: `${apiUrl}/remote.php/dav/files/${username}/${folderName}/`,
      auth: { username, password },
    });
    return true;
  } catch (error) {
    console.error('Błąd usuwania folderu:', error.response?.data || error.message);
    return false;
  }
}

// Definicja ustawień wtyczki
const configurationWorkflow = () => ({
  steps: [
    {
      name: 'Ustawienia Nextcloud',
      form: [
        { name: 'nextcloud_url', label: 'URL Nextcloud', type: 'String', required: true },
        { name: 'nextcloud_user', label: 'Nextcloud Username', type: 'String', required: true },
        { name: 'nextcloud_password', label: 'Nextcloud Password', type: 'String', required: true },
        { name: 'folder_column', label: 'Kolumna z nazwą folderu', type: 'String', required: true },
        { name: 'max_files', label: 'Maksymalna liczba plików na folder', type: 'Integer', required: false },
        { name: 'allowed_roles', label: 'Role z dostępem', type: 'String', required: false },
        { name: 'enable_notifications', label: 'Powiadomienia o nowych plikach', type: 'Bool', required: false },
        { name: 'file_tags', label: 'Tagowanie plików', type: 'Bool', required: false },
      ],
    },
  ],
});

// Rejestracja pluginu
const plugin = new Plugin({
  name: 'nextcloud_file_manager',
  description: 'Integracja Saltcorn z Nextcloud do zarządzania plikami.',
  configuration_workflow: configurationWorkflow,
  onTableCreate: async (table, pluginConfig) => {
    const columnName = pluginConfig.configuration.folder_column;
    table.subscribe('insert', async (row) => {
      const folderName = row[columnName];
      await createNextcloudFolder(
        pluginConfig.configuration.nextcloud_url,
        pluginConfig.configuration.nextcloud_user,
        pluginConfig.configuration.nextcloud_password,
        folderName
      );
    });
  },
  actions: {
    delete_folder: async ({ row, pluginConfig }) => {
      const folderName = row[pluginConfig.configuration.folder_column];
      return await deleteNextcloudFolder(
        pluginConfig.configuration.nextcloud_url,
        pluginConfig.configuration.nextcloud_user,
        pluginConfig.configuration.nextcloud_password,
        folderName
      );
    },
    list_files: async ({ row, pluginConfig }) => {
      const folderName = row[pluginConfig.configuration.folder_column];
      return await listNextcloudFiles(
        pluginConfig.configuration.nextcloud_url,
        pluginConfig.configuration.nextcloud_user,
        pluginConfig.configuration.nextcloud_password,
        folderName
      );
    },
  },
});

module.exports = plugin;
