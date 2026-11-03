// Initialize Map centered on Omsk
const map = L.map('map').setView([54.9893, 73.3682], 12);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Add Geoman controls for professional drawing/editing
map.pm.addControls({
    position: 'topleft',
    drawCircle: false,
});

let loadedLayers = {}; // Store layer instances for toggling visibility

// Helper for XSS sanitization
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// Load Tree View
async function loadTreeView() {
    const catResponse = await fetch('/categories/');
    const categories = await catResponse.json();

    const layerResponse = await fetch('/layers/');
    const layers = await layerResponse.json();

    const treeData = [];

    // Add default category if none
    if (categories.length === 0) {
        await fetch('/categories/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: 'Default Category'})
        });
        return loadTreeView();
    }

    // Populate selects
    const selects = document.querySelectorAll('.category-select');
    selects.forEach(select => {
        select.innerHTML = '<option value="">None (Root)</option>';
    });

    categories.forEach(cat => {
        // Tree node
        treeData.push({
            id: `cat_${cat.id}`,
            parent: cat.parent_id ? `cat_${cat.parent_id}` : '#',
            text: sanitizeHTML(cat.name),
            state: { opened: true }
        });

        // Dropdown option
        selects.forEach(select => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            select.appendChild(option);
        });
    });

    layers.forEach(layer => {
        const nodeId = `layer_${layer.id}`;
        treeData.push({
            id: nodeId,
            parent: layer.category_id ? `cat_${layer.category_id}` : '#',
            text: sanitizeHTML(layer.name),
            icon: layer.is_kmz ? 'jstree-file' : 'jstree-leaf',
            state: { selected: true }, // Default checked
            data: layer
        });

        // Auto-load layers if not already loaded
        if (!loadedLayers[nodeId]) {
            if (layer.is_kmz && layer.file_path) {
                // Leaflet-KMZ logic
                let kmz = L.kmzLayer().on('load', function(e) {
                    loadedLayers[nodeId] = e.layer;
                    // Only add to map if tree node is selected
                    const tree = $('#jstree_div').jstree(true);
                    if (tree && tree.is_selected(nodeId)) {
                        e.layer.addTo(map);
                    }
                });
                kmz.load(layer.file_path);
            } else if (layer.geojson_data) {
                let geoLayer = L.geoJSON(JSON.parse(layer.geojson_data));
                loadedLayers[nodeId] = geoLayer;
                // Since this is sync, add immediately for default checked state
                geoLayer.addTo(map);
            }
        } else {
            // Already loaded, just ensure it's on map if selected
            // But we actually defer this to the jstree 'ready' or 'changed' event to avoid race conditions
        }
    });

    $('#jstree_div').jstree('destroy');
    $('#jstree_div').jstree({
        'core': {
            'data': treeData
        },
        "checkbox": {
            "keep_selected_style": false,
            "three_state": true,
            "cascade": "up+down"
        },
        "plugins": ["checkbox"]
    });

    // Sync map when tree finishes loading
    $('#jstree_div').on("ready.jstree", function () {
        syncMapWithTree();
    });

    $('#jstree_div').on("changed.jstree", function (e, data) {
        syncMapWithTree();
    });
}

function syncMapWithTree() {
    const tree = $('#jstree_div').jstree(true);
    if (!tree) return;

    const selectedIds = tree.get_selected();

    // Hide all layers first
    Object.keys(loadedLayers).forEach(key => {
        if (map.hasLayer(loadedLayers[key])) {
            map.removeLayer(loadedLayers[key]);
        }
    });

    // Show only selected ones
    selectedIds.forEach(id => {
        if (id.startsWith('layer_') && loadedLayers[id]) {
            loadedLayers[id].addTo(map);
        }
    });
}

// Upload Form Handler
document.getElementById('layerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('layerName').value;
    const catId = document.getElementById('layerCategory').value;
    const fileInput = document.getElementById('kmzFile');

    if (fileInput.files.length > 0) {
        // Upload KMZ
        const formData = new FormData();
        formData.append("name", name);
        if (catId) formData.append("category_id", catId);
        formData.append("file", fileInput.files[0]);

        await fetch('/upload_kmz/', {
            method: 'POST',
            body: formData
        });
    } else {
        // Just create empty layer or alert
        alert("Please select a KMZ file or use 'Save Drawn Layer'");
    }

    document.getElementById('layerForm').reset();
    loadTreeView();
});

let pendingGeojson = null;
let saveModal = null;

// Show Save Modal
document.getElementById('saveDrawnLayerBtn').addEventListener('click', () => {
    const fg = map.pm.getGeomanDrawLayers();
    if (fg.length === 0) {
        alert("No layers drawn to save.");
        return;
    }

    pendingGeojson = L.featureGroup(fg).toGeoJSON();

    if (!saveModal) {
        saveModal = new bootstrap.Modal(document.getElementById('saveLayerModal'));
    }
    document.getElementById('drawnLayerName').value = "";
    document.getElementById('drawnLayerCategory').value = "";
    saveModal.show();
});

// Confirm Save
document.getElementById('confirmSaveDrawnLayer').addEventListener('click', async () => {
    const name = document.getElementById('drawnLayerName').value;
    const catId = document.getElementById('drawnLayerCategory').value;

    if (!name) {
        alert("Please enter a layer name.");
        return;
    }

    await fetch('/layers/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            name: name,
            category_id: catId ? parseInt(catId) : null,
            geojson_data: JSON.stringify(pendingGeojson)
        })
    });

    // Clear drawn layers after save
    const fg = map.pm.getGeomanDrawLayers();
    fg.forEach(l => map.removeLayer(l));

    saveModal.hide();
    loadTreeView();
});

// Category Form Handler
document.getElementById('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newCategoryName').value;

    await fetch('/categories/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: name })
    });

    document.getElementById('categoryForm').reset();
    loadTreeView();
});

// Initial load
$(document).ready(function() {
    loadTreeView();
});
