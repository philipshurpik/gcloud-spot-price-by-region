const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const regionCombobox = document.querySelector('[role="combobox"]');

regionCombobox.click();
await delay(300); // Wait for dropdown to populate

const comboboxParent = regionCombobox.parentElement;
const regionOptions = Array.from(comboboxParent.querySelectorAll('[role="option"]'));

const regions = regionOptions.map(option => ({
    value: option.getAttribute('data-value'),
    name: option.innerText.trim()
}));

regionCombobox.click();
await delay(300);

const pricingData = {};
for (const region of regions) {
    // Open the dropdown and select the region
    regionCombobox.click();
    await delay(300);
    const option = document.querySelector(`[role="option"][data-value="${region.value}"]`);
    if (option) {
        option.click();
        await delay(1000); // Wait for the tables to update

        // Extract pricing data from the tables
        const tables = document.querySelectorAll('table');
        const tableCpuMem = tables[0];
        const tableGpu = tables[1];

        if (!tableCpuMem || !tableGpu) {
            console.error('Pricing tables not found for region:', region.name);
            continue;
        }

        const regionPricing = {
            cpu: {},
            mem: {},
            gpu: {}
        };

        // Process CPU and Memory prices (from tableCpuMem)
        const rowsCpuMem = Array.from(tableCpuMem.querySelectorAll('tbody tr'));
        rowsCpuMem.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
                try {
                    const instanceType = cells[0].innerText.trim();
                    const cpuPrice = parseFloat(cells[2].innerText.replace('$', '').trim());
                    const memPrice = parseFloat(cells[3].innerText.replace('$', '').trim());

                    if (['E2', 'G2'].includes(instanceType)) {
                        regionPricing.cpu[instanceType] = cpuPrice;
                        regionPricing.mem[instanceType] = memPrice;
                    }
                }
                catch (e) {}
            }
        });

        // Process GPU prices (from tableGpu)
        const rowsGpu = Array.from(tableGpu.querySelectorAll('tbody tr'));
        rowsGpu.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0 && cells[0].innerText.trim() === 'L4') {
                regionPricing.gpu['G2'] = parseFloat(cells[1].innerText.replace('$', '').trim());
            }
        });

        pricingData[region.name] = regionPricing;
    } else {
        console.error('Option not found for region:', region.name);
    }
}

// g2-standard-4 and e2-standard-2
machines = {
    'G2': {
        'cpu': 4, 'mem': 16, 'gpu': '1'
    },
    'E2': {
        'cpu': 2, 'mem': 8
    }
}


console.log('Raw Pricing Data:', pricingData);

// Example processing and sorting logic
const processedDataE2 = Object.entries(pricingData).map(([region, prices]) => {
    const price = prices.cpu['E2'] * machines['E2']['cpu'] + prices.mem['E2'] * machines['E2']['mem']
    return {
        region,
        price
    };
});

const processedDataG2 = Object.entries(pricingData).map(([region, prices]) => {
    if (!prices.gpu['G2']) return null;
    const price = prices.cpu['G2'] * machines['G2']['cpu'] + prices.mem['G2'] * machines['G2']['mem'] + (prices.gpu['G2'] || 1000)
    return {
        region,
        price
    };
}).filter(Boolean);


const e2Sorted = [...processedDataE2].sort((a, b) => a.price - b.price);
const g2Sorted = [...processedDataG2].sort((a, b) => a.price - b.price);

console.log('Sorted E2 Pricing:', e2Sorted);
console.log('Sorted G2 Pricing:', g2Sorted);
