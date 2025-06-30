// Visual Subnet Calculator - Refactored JavaScript

// Global state
const state = {
    network: 0,
    mask: 0,
    rootSubnet: null,
    binaryFormat: false,
    networkLabels: {}, // Maps subnet key to label info
    selectedSubnet: null,
    visibleColumns: {
        subnet: true,
        netmask: true,
        network: true,
        broadcast: true,
        range: true,
        useable: true,
        hosts: true,
        hostsUsable: true,
        join: true,
    }
};

// Available labels with colors
const availableLabels = [
    { name: "A", color: "#dc3545" },    // Red
    { name: "B", color: "#fd7e14" },    // Orange
    { name: "C", color: "#ffc107" },    // Yellow
    { name: "D", color: "#28a745" },    // Green
    { name: "E", color: "#20c997" },    // Teal
    { name: "F", color: "#17a2b8" },    // Cyan
    { name: "G", color: "#007bff" },    // Blue
    { name: "H", color: "#6610f2" },    // Indigo
    { name: "I", color: "#6f42c1" },    // Purple
    { name: "J", color: "#e83e8c" },    // Pink
];

// IP address utility functions
const ipUtils = {
    // Convert IP string to 32-bit integer
    aton: function(addrStr) {
        const regex = /^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/;
        const matches = regex.exec(addrStr);

        if (!matches) return null;

        for (let i = 1; i <= 4; i++) {
            if (matches[i] < 0 || matches[i] > 255) {
                return null;
            }
        }

        return (matches[1] << 24) | (matches[2] << 16) | (matches[3] << 8) | matches[4];
    },

    // Convert 32-bit integer to IP string
    ntoa: function(addrInt) {
        return [
            (addrInt >> 24) & 0xff,
            (addrInt >> 16) & 0xff,
            (addrInt >> 8) & 0xff,
            addrInt & 0xff
        ].join(".");
    },

    // Calculate network address from IP and mask
    networkAddress: function(ip, mask) {
        for (let i = 31 - mask; i >= 0; i--) {
            ip &= ~(1 << i);
        }
        return ip;
    },

    // Get number of addresses in subnet
    subnetAddresses: function(mask) {
        return Math.pow(2, 32 - mask);
    },

    // Get last address in subnet
    lastAddress: function(subnet, mask) {
        return subnet + ipUtils.subnetAddresses(mask) - 1;
    },

    // Get subnet netmask
    netmask: function(mask) {
        return ipUtils.networkAddress(0xffffffff, mask);
    },

    // Convert IP to binary format (dotted binary)
    toBinary: function(addrInt) {
        const octets = [
            (addrInt >> 24) & 0xff,
            (addrInt >> 16) & 0xff,
            (addrInt >> 8) & 0xff,
            addrInt & 0xff
        ];
        return octets.map(octet => octet.toString(2).padStart(8, "0")).join(".");
    },

    // Format IP address based on current format setting
    format: function(addrInt) {
        return state.binaryFormat ? ipUtils.toBinary(addrInt) : ipUtils.ntoa(addrInt);
    }
};

// Subnet tree management
const subnetTree = {
    // Create new subnet node
    createNode: function() {
        return [0, 0, null]; // [depth, numChildren, children]
    },

    // Update number of children recursively
    updateNumChildren: function(node) {
        if (!node[2]) {
            node[1] = 0;
            return 1;
        }
        node[1] = subnetTree.updateNumChildren(node[2][0]) + 
                  subnetTree.updateNumChildren(node[2][1]);
        return node[1];
    },

    // Update depth of children recursively
    updateDepthChildren: function(node) {
        if (!node[2]) {
            node[0] = 0;
            return 1;
        }
        node[0] = subnetTree.updateDepthChildren(node[2][0]) + 
                  subnetTree.updateDepthChildren(node[2][1]);
        return node[1];
    },

    // Convert subnet tree to string for saving
    toString: function(node) {
        if (node[2]) {
            return "1" + subnetTree.toString(node[2][0]) + subnetTree.toString(node[2][1]);
        }
        return "0";
    },

    // Load subnet tree from string
    fromString: function(node, str) {
        if (str.charAt(0) === "0") {
            return str.substr(1);
        }
        
        node[2] = [subnetTree.createNode(), subnetTree.createNode()];
        str = subnetTree.fromString(node[2][0], str.substr(1));
        str = subnetTree.fromString(node[2][1], str);
        return str;
    }
};

// UI functions
const ui = {
    // Toggle column visibility
    toggleColumn: function(checkbox) {
        const columnName = checkbox.id.substr(3);
        state.visibleColumns[columnName] = checkbox.checked;
        ui.recreateTables();
    },

    // Update column header visibility
    updateHeaders: function() {
        for (const name in state.visibleColumns) {
            const header = document.getElementById(name + "Header");
            if (header) {
                header.style.display = state.visibleColumns[name] ? "table-cell" : "none";
            }
        }
    },

    // Create subnet row in table
    createRow: function(tbody, node, address, mask, labels, depth) {
        if (node[2]) {
            // Node has children - recurse
            const newLabels = [...labels, mask + 1, node[2][0][1], node[2][0]];
            ui.createRow(tbody, node[2][0], address, mask + 1, newLabels, depth - 1);

            const newLabels2 = [mask + 1, node[2][1][1], node[2][1]];
            ui.createRow(tbody, node[2][1], address + ipUtils.subnetAddresses(mask + 1), 
                        mask + 1, newLabels2, depth - 1);
        } else {
            // Leaf node - create table row
            const row = ui.createSubnetRow(address, mask, node, labels, depth);
            tbody.appendChild(row);
        }
    },

    // Create individual subnet row
    createSubnetRow: function(address, mask, node, labels, depth) {
        const row = document.createElement("tr");
        const subnetKey = `${address}/${mask}`;
        
        // Store subnet hierarchy info
        row.setAttribute("data-subnet-key", subnetKey);
        row.setAttribute("data-address", address);
        row.setAttribute("data-mask", mask);
        
        // Add hover handlers for hierarchical highlighting
        row.onmouseenter = function() {
            ui.highlightSubnetHierarchy(address, mask, true);
        };
        row.onmouseleave = function() {
            ui.highlightSubnetHierarchy(address, mask, false);
        };
        
        // Make row a drop target
        row.ondragover = function(e) {
            e.preventDefault();
            this.classList.add("drag-over");
        };
        row.ondragleave = function(e) {
            this.classList.remove("drag-over");
        };
        row.ondrop = function(e) {
            e.preventDefault();
            this.classList.remove("drag-over");
            
            const labelData = e.dataTransfer.getData("application/json");
            if (labelData) {
                const label = JSON.parse(labelData);
                state.networkLabels[subnetKey] = label;
                ui.recreateTables();
            }
        };
        
        // Apply label styling if this subnet is labeled
        if (state.networkLabels[subnetKey]) {
            const label = state.networkLabels[subnetKey];
            row.setAttribute("data-label", label.name);
            row.setAttribute("data-label-color", label.color);
        }
        
        // Calculate addresses
        const addressFirst = address;
        const addressLast = ipUtils.lastAddress(address, mask);
        let useableFirst = address + 1;
        let useableLast = addressLast - 1;
        let totalIPs, usableHosts, addressRange, useableRange;

        // Calculate total IPs and usable hosts
        totalIPs = ipUtils.subnetAddresses(mask);
        
        if (mask === 32) {
            addressRange = ipUtils.format(addressFirst);
            useableRange = addressRange;
            usableHosts = 1;  // Single host address
        } else if (mask === 31) {
            addressRange = `${ipUtils.format(addressFirst)} - ${ipUtils.format(addressLast)}`;
            useableRange = addressRange;
            usableHosts = 2;  // Point-to-point link (RFC 3021)
        } else {
            addressRange = `${ipUtils.format(addressFirst)} - ${ipUtils.format(addressLast)}`;
            useableRange = `${ipUtils.format(useableFirst)} - ${ipUtils.format(useableLast)}`;
            usableHosts = totalIPs - 2;  // Subtract network and broadcast addresses
        }

        // Add label cell
        const labelCell = document.createElement("td");
        if (state.networkLabels[subnetKey]) {
            const badge = document.createElement("span");
            badge.className = "badge";
            badge.style.backgroundColor = state.networkLabels[subnetKey].color;
            badge.textContent = state.networkLabels[subnetKey].name;
            labelCell.appendChild(badge);
        }
        row.appendChild(labelCell);
        
        // Add cells based on visible columns
        if (state.visibleColumns.subnet) {
            row.appendChild(ui.createCell(`${ipUtils.format(address)}/${mask}`));
        }
        if (state.visibleColumns.netmask) {
            row.appendChild(ui.createCell(ipUtils.format(ipUtils.netmask(mask))));
        }
        if (state.visibleColumns.network) {
            row.appendChild(ui.createCell(ipUtils.format(addressFirst)));
        }
        if (state.visibleColumns.broadcast) {
            row.appendChild(ui.createCell(ipUtils.format(addressLast)));
        }
        if (state.visibleColumns.range) {
            row.appendChild(ui.createCell(addressRange, true));
        }
        if (state.visibleColumns.useable) {
            row.appendChild(ui.createCell(useableRange, true));
        }
        if (state.visibleColumns.hosts) {
            row.appendChild(ui.createCell(totalIPs.toString()));
        }
        if (state.visibleColumns.hostsUsable) {
            row.appendChild(ui.createCell(usableHosts.toString()));
        }
        if (state.visibleColumns.join) {
            ui.addJoinCells(row, labels, depth - node[0], node, mask);
        }

        return row;
    },

    // Create table cell
    createCell: function(text, multiline = false) {
        const cell = document.createElement("td");
        if (multiline && text.includes(" - ")) {
            // Split range into multiple lines
            const parts = text.split(" - ");
            const container = document.createElement("div");
            container.className = "text-center";
            
            // First IP
            const line1 = document.createElement("div");
            line1.textContent = parts[0];
            container.appendChild(line1);
            
            // Dash
            const line2 = document.createElement("div");
            line2.textContent = "-";
            container.appendChild(line2);
            
            // Second IP
            const line3 = document.createElement("div");
            line3.textContent = parts[1];
            container.appendChild(line3);
            
            cell.appendChild(container);
        } else {
            cell.textContent = text;
        }
        return cell;
    },

    // Create action cell (divide button)
    createActionCell: function(mask, node) {
        const cell = document.createElement("td");
        if (mask === 32) {
            cell.innerHTML = '<span class="text-muted">Divide</span>';
        } else {
            const link = document.createElement("a");
            link.href = "#";
            link.className = "btn btn-sm btn-outline-primary";
            link.textContent = "Divide";
            link.onclick = function(e) {
                e.preventDefault();
                actions.divide(node);
            };
            cell.appendChild(link);
        }
        return cell;
    },

    // Add join cells for visualization
    addJoinCells: function(row, labels, colspan, leafNode, leafMask) {
        // Get label color if this row has one
        const labelColor = row.getAttribute("data-label-color");
        
        for (let i = (labels.length / 3) - 1; i >= 0; i--) {
            const mask = labels[i * 3];
            const rowspan = labels[(i * 3) + 1];
            const joinNode = labels[(i * 3) + 2];

            const cell = document.createElement("td");
            cell.rowSpan = rowspan > 1 ? rowspan : 1;
            cell.colSpan = colspan > 1 ? colspan : 1;
            
            const isLastLevel = i === (labels.length / 3) - 1;
            
            // Determine if this is a leaf (can be divided) or can be joined
            if (isLastLevel && leafMask < 32) {
                // This is the leaf cell - make it dividable
                cell.className = "subnet-visual-dividable";
                cell.onclick = function() { actions.divide(leafNode); };
                cell.style.cursor = "pointer";
                cell.title = "Click to divide into /" + (leafMask + 1);
            } else if (!isLastLevel) {
                // This is a parent cell - make it joinable
                cell.className = "subnet-visual-joinable";
                cell.onclick = function() { actions.join(joinNode); };
                cell.style.cursor = "pointer";
                cell.title = "Click to join subnets";
            } else {
                // This is a /32 - cannot be divided
                cell.className = "subnet-visual";
                cell.title = "Cannot divide /32";
            }
            
            cell.setAttribute("data-mask", mask);
            
            // Apply label color ONLY to the last level (the subnet itself)
            if (labelColor && isLastLevel) {
                cell.style.backgroundColor = labelColor + "30"; // 30 = ~19% opacity
            }
            
            // Add visual representation
            const badge = document.createElement("span");
            badge.className = "badge bg-secondary";
            badge.textContent = `/${mask}`;
            cell.appendChild(badge);
            
            row.appendChild(cell);
            colspan = 1; // Reset for subsequent cells
        }
    },

    // Recreate the entire table
    recreateTables: function() {
        ui.updateHeaders();

        const tbody = document.getElementById("calcbody");
        if (!tbody) return;

        // Clear existing rows
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }

        // Update tree structure
        subnetTree.updateNumChildren(state.rootSubnet);
        subnetTree.updateDepthChildren(state.rootSubnet);

        // Create rows
        ui.createRow(tbody, state.rootSubnet, state.network, state.mask, 
                    [state.mask, state.rootSubnet[1], state.rootSubnet], 
                    state.rootSubnet[0]);

        // Update join header colspan
        const joinHeader = document.getElementById("joinHeader");
        if (joinHeader) {
            joinHeader.colSpan = state.rootSubnet[0] > 0 ? state.rootSubnet[0] : 1;
        }

        // Update save link
        ui.updateSaveLink();
        
        // Update label buttons
        ui.updateLabelButtons();
    },

    // Update save configuration link
    updateSaveLink: function() {
        const saveButton = document.getElementById("saveButton");
        if (saveButton) {
            const treeStr = subnetTree.toString(state.rootSubnet);
            const encoded = encoding.binToAscii(treeStr);
            
            // Build URL with network config
            let url = `${window.location.origin}${window.location.pathname}?network=${ipUtils.ntoa(state.network)}&mask=${state.mask}&division=${encoded}`;
            
            // Add labels if any exist
            if (Object.keys(state.networkLabels).length > 0) {
                const labelsStr = encodeURIComponent(JSON.stringify(state.networkLabels));
                url += `&labels=${labelsStr}`;
            }
            
            saveButton.onclick = function() {
                navigator.clipboard.writeText(url).then(function() {
                    // Show toast notification
                    const toast = new bootstrap.Toast(document.getElementById("saveToast"));
                    toast.show();
                });
            };
        }
    },

    // Update label buttons
    updateLabelButtons: function() {
        const container = document.getElementById("labelButtons");
        if (!container) return;
        
        container.innerHTML = "";
        
        // Add draggable label buttons
        availableLabels.forEach(label => {
            const btn = document.createElement("button");
            btn.className = "btn btn-sm label-draggable";
            btn.style.backgroundColor = label.color;
            btn.style.color = "#fff";
            btn.textContent = label.name;
            
            // Check if this label is already in use
            const isUsed = Object.values(state.networkLabels).some(l => l.name === label.name);
            const usedBySubnet = isUsed ? Object.keys(state.networkLabels).find(key => 
                state.networkLabels[key].name === label.name) : null;
            
            if (isUsed) {
                btn.disabled = true;
                btn.style.opacity = "0.5";
                btn.title = `Already assigned to ${usedBySubnet}`;
                
                // Add remove functionality on click for used labels
                btn.onclick = function() {
                    if (confirm(`Remove label "${label.name}" from ${usedBySubnet}?`)) {
                        delete state.networkLabels[usedBySubnet];
                        ui.recreateTables();
                    }
                };
            } else {
                // Make it draggable
                btn.draggable = true;
                btn.ondragstart = function(e) {
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData("application/json", JSON.stringify({
                        name: label.name,
                        color: label.color
                    }));
                    this.classList.add("dragging");
                };
                btn.ondragend = function(e) {
                    this.classList.remove("dragging");
                };
            }
            
            container.appendChild(btn);
        });
    },

    // Highlight subnet hierarchy on hover
    highlightSubnetHierarchy: function(hoverAddress, hoverMask, isHovering) {
        const rows = document.querySelectorAll("#calcbody tr");
        
        rows.forEach(row => {
            const address = parseInt(row.getAttribute("data-address"));
            const mask = parseInt(row.getAttribute("data-mask"));
            
            if (isHovering) {
                // Check if this row is part of the hierarchy
                if (mask <= hoverMask) {
                    // This is a parent - check if hover subnet is within this subnet
                    const parentEnd = address + ipUtils.subnetAddresses(mask) - 1;
                    const hoverEnd = hoverAddress + ipUtils.subnetAddresses(hoverMask) - 1;
                    
                    if (hoverAddress >= address && hoverEnd <= parentEnd) {
                        row.classList.add("hierarchy-highlight");
                    }
                } else {
                    // This is a child - check if it's within the hover subnet
                    const hoverEnd = hoverAddress + ipUtils.subnetAddresses(hoverMask) - 1;
                    const childEnd = address + ipUtils.subnetAddresses(mask) - 1;
                    
                    if (address >= hoverAddress && childEnd <= hoverEnd) {
                        row.classList.add("hierarchy-highlight");
                    }
                }
            } else {
                row.classList.remove("hierarchy-highlight");
            }
        });
    }
};

// Encoding utilities for save/load
const encoding = {
    binToAscii: function(str) {
        let output = "";
        let currentBit = 0;
        let currentChar = 0;

        for (let i = 0; i < str.length; i++) {
            if (str.charAt(i) === "1") {
                currentChar |= 1 << currentBit;
            }
            currentBit++;
            if (currentBit > 3) {
                output += currentChar.toString(16);
                currentChar = 0;
                currentBit = 0;
            }
        }
        if (currentBit > 0) {
            output += currentChar.toString(16);
        }
        return str.length + "." + output;
    },

    asciiToBin: function(str) {
        const regex = /([0-9]+)\.([0-9a-f]+)/;
        const matches = regex.exec(str);
        if (!matches) return "0";
        
        const len = parseInt(matches[1]);
        let output = "";
        
        for (let i = 0; i < len; i++) {
            const charIndex = Math.floor(i / 4);
            if (charIndex >= matches[2].length) break;
            
            const ch = parseInt(matches[2].charAt(charIndex), 16);
            const pos = i % 4;
            output += (ch & (1 << pos)) ? "1" : "0";
        }
        return output;
    }
};

// Action handlers
const actions = {
    divide: function(node) {
        node[2] = [subnetTree.createNode(), subnetTree.createNode()];
        ui.recreateTables();
    },

    join: function(node) {
        node[2] = null;
        ui.recreateTables();
    },

    updateNetwork: function() {
        const networkStr = document.forms["calc"].elements["network"].value;
        const newMask = parseInt(document.forms["calc"].elements["netbits"].value);
        
        const newNetwork = ipUtils.aton(networkStr);
        
        if (newNetwork === null) {
            alert("Invalid network address entered");
            return;
        }
        
        // Check if address is on network boundary
        const correctedNetwork = ipUtils.networkAddress(newNetwork, newMask);
        if (newNetwork !== correctedNetwork) {
            alert(`The network address entered is not on a network boundary for this mask.\nIt has been changed to ${ipUtils.ntoa(correctedNetwork)}.`);
            document.forms["calc"].elements["network"].value = ipUtils.ntoa(correctedNetwork);
        }
        
        if (newMask < 0 || newMask > 32) {
            alert("The network mask you have entered is invalid");
            return;
        }
        
        // Check if we need to reset
        if (state.mask === 0 || (state.mask !== newMask && 
            confirm(`You are changing the base network from /${state.mask} to /${newMask}. This will reset any changes you have made. Proceed?`))) {
            state.mask = newMask;
            state.network = correctedNetwork;
            actions.startOver();
        } else {
            document.forms["calc"].elements["netbits"].value = state.mask;
            state.network = correctedNetwork;
            ui.recreateTables();
        }
    },

    startOver: function() {
        state.rootSubnet = subnetTree.createNode();
        state.networkLabels = {}; // Clear labels on reset
        state.selectedSubnet = null;
        ui.recreateTables();
    }
};

// Initialization
function init() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Parse query string
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has("network") && urlParams.has("mask") && urlParams.has("division")) {
        document.forms["calc"].elements["network"].value = urlParams.get("network");
        document.forms["calc"].elements["netbits"].value = urlParams.get("mask");
        actions.updateNetwork();
        
        const division = encoding.asciiToBin(urlParams.get("division"));
        state.rootSubnet = subnetTree.createNode();
        if (division !== "0") {
            subnetTree.fromString(state.rootSubnet, division);
        }
        
        // Load labels if present
        if (urlParams.has("labels")) {
            try {
                const labelsStr = urlParams.get("labels");
                state.networkLabels = JSON.parse(decodeURIComponent(labelsStr));
            } catch (e) {
                console.error("Failed to parse labels from URL:", e);
            }
        }
        
        ui.recreateTables();
    } else {
        actions.updateNetwork();
    }
}

// Global function bindings for HTML onclick handlers
window.updateNetwork = actions.updateNetwork;
window.toggleColumn = ui.toggleColumn;
window.confirmReset = function() {
    if (confirm("This will reset all subnet divisions you have made. Proceed?")) {
        actions.startOver();
    }
};
window.toggleBinaryFormat = function() {
    state.binaryFormat = document.getElementById("binaryFormat").checked;
    document.body.classList.toggle("binary-format", state.binaryFormat);
    ui.recreateTables();
};
window.clearAllLabels = function() {
    if (confirm("Remove all network labels?")) {
        state.networkLabels = {};
        state.selectedSubnet = null;
        ui.recreateTables();
    }
};

// Initialize on page load
window.addEventListener("DOMContentLoaded", function() {
    init();
    ui.updateLabelButtons();
});