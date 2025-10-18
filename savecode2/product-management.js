// product-management.js

(() => {
    // คีย์ Local Storage หลักสำหรับเก็บข้อมูลสินค้า
    const PRODUCTS_STORAGE_KEY = 'mala_menu_items';

    // ----------------------------------------
    // Elements
    // ----------------------------------------
    const productListBody = document.getElementById('productListBody');
    const productRowTemplate = document.getElementById('productRowTemplate');
    const productForm = document.getElementById('productForm');
    const productName = document.getElementById('productName');
    const productCategory = document.getElementById('productCategory');
    const productPrice = document.getElementById('productPrice');
    const productSku = document.getElementById('productSku');
    // เปลี่ยนจาก text input เป็น file input
    const productImageFile = document.getElementById('productImageFile');
    // ใช้ hidden input สำหรับเก็บ Base64
    const productImageBase64 = document.getElementById('productImageBase64');
    const imagePreview = document.getElementById('imagePreview');
    const productId = document.getElementById('productId');
    const saveProductBtn = document.getElementById('saveProductBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    let menuItems = []; // ตัวแปรเก็บรายการสินค้าทั้งหมด

    // ----------------------------------------
    // 1. Local Storage & Data Management
    // ----------------------------------------
    
    /** ข้อมูลเมนูเริ่มต้น (ใช้ Base64 ของรูป dummy แทน) */
    // เนื่องจากเราไม่สามารถเข้าถึงไฟล์ 'images/xxx.jpg' ได้โดยตรงเมื่อใช้ file input 
    // ข้อมูลเริ่มต้นจึงต้องใช้ Base64 หรืออาจจะไม่ต้องมีรูปภาพ
    const defaultMenuItems = [
        { id: 'sku-lukchin', name: 'ลูกชิ้น', category: 'cat-fresh', price: 5, imageBase64: '' }, 
        { id: 'sku-pakkad', name: 'ผักกาดขาว', category: 'cat-veggie', price: 7, imageBase64: '' },
        { id: 'sku-muk', name: 'ปลาหมึกกรอบ', category: 'cat-fresh', price: 10, imageBase64: '' },
        { id: 'sku-moo', name: 'เนื้อหมู', category: 'cat-meat', price: 15, imageBase64: '' }
    ];

    /**
     * ดึงรายการสินค้าจาก Local Storage
     */
    const loadProducts = () => {
        try {
            const storedItems = localStorage.getItem(PRODUCTS_STORAGE_KEY);
            // ถ้าไม่มีข้อมูล ให้ตั้งค่าเริ่มต้น
            menuItems = storedItems ? JSON.parse(storedItems) : defaultMenuItems;
        } catch (e) {
            console.error("Error loading products from Local Storage:", e);
            menuItems = defaultMenuItems;
        }
    };

    /**
     * บันทึกรายการสินค้าทั้งหมดลงใน Local Storage
     */
    const saveProducts = () => {
        try {
            localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(menuItems));
            renderProductList(); // โหลดรายการมาแสดงใหม่
        } catch (e) {
            console.error("Error saving products to Local Storage:", e);
            alert("❌ บันทึกข้อมูลสินค้าไม่ได้");
        }
    };

    // ----------------------------------------
    // 2. UI & Rendering
    // ----------------------------------------

    /** แปลง category ID เป็นชื่อที่เข้าใจได้ */
    const getCategoryName = (categoryId) => {
        switch (categoryId) {
            case 'cat-fresh': return 'ของสด';
            case 'cat-meat': return 'เนื้อสัตว์';
            case 'cat-veggie': return 'ผัก';
            case 'cat-other': return 'อื่นๆ';
            default: return 'ไม่ระบุ';
        }
    };

    /** แสดงรูปตัวอย่าง */
    const updateImagePreview = (base64) => {
        imagePreview.innerHTML = '';
        if (base64) {
            const img = document.createElement('img');
            img.src = base64;
            img.alt = 'รูปสินค้า';
            imagePreview.appendChild(img);
        } else {
            const p = document.createElement('p');
            p.textContent = 'ไม่มีรูปภาพ';
            imagePreview.appendChild(p);
        }
    };

    /** แสดงรายการสินค้าทั้งหมด */
    const renderProductList = () => {
        productListBody.innerHTML = '';

        menuItems.forEach(item => {
            const row = productRowTemplate.content.querySelector('.tr--product-item').cloneNode(true);
            
            row.dataset.id = item.id;
            row.querySelector('.td-sku').textContent = item.id;
            row.querySelector('.td-name').textContent = item.name;
            row.querySelector('.td-price').textContent = item.price.toFixed(0);
            row.querySelector('.td-category').textContent = getCategoryName(item.category);
            
            // ตั้งค่า ID ให้กับปุ่มจัดการ
            row.querySelector('.btn-edit').dataset.id = item.id;
            row.querySelector('.btn-delete').dataset.id = item.id;

            row.querySelector('.btn-edit').addEventListener('click', handleEdit);
            row.querySelector('.btn-delete').addEventListener('click', handleDelete);
            
            productListBody.appendChild(row);
        });
    };

    /** ล้างฟอร์ม */
    const clearForm = () => {
        productId.value = ''; // ล้าง ID
        productForm.reset(); // ล้างค่าในฟอร์มทั้งหมด
        productImageBase64.value = ''; // ล้าง Base64
        updateImagePreview('');
        productSku.disabled = false; // เปิดใช้งาน SKU
        saveProductBtn.textContent = 'เพิ่มสินค้า';
        cancelEditBtn.style.display = 'none';
        productForm.scrollIntoView({ behavior: 'smooth' }); // เลื่อนกลับไปที่ฟอร์ม
    };

    // ----------------------------------------
    // 3. Event Handlers
    // ----------------------------------------
    
    /** จัดการการเพิ่ม/แก้ไขสินค้า */
    const handleFormSubmit = (e) => {
        e.preventDefault();

        const idValue = productId.value;
        const nameValue = productName.value.trim();
        const categoryValue = productCategory.value;
        const priceValue = parseFloat(productPrice.value);
        const skuValue = productSku.value.trim();
        const imageBase64Value = productImageBase64.value; // Base64 string

        if (!nameValue || !categoryValue || isNaN(priceValue) || !skuValue) {
            alert('กรุณากรอกข้อมูลสินค้าให้ครบถ้วน');
            return;
        }

        // --- FIX 1: ตรวจสอบ SKU ซ้ำสำหรับสินค้าใหม่ ---
        if (!idValue) { // สินค้าใหม่
            const isDuplicate = menuItems.some(item => item.id === skuValue);
            if (isDuplicate) {
                alert(`❌ SKU: ${skuValue} นี้มีอยู่ในระบบแล้ว กรุณาใช้ SKU อื่น`);
                return;
            }
        }
        // --- สิ้นสุด FIX 1 ---


        const newProduct = {
            id: skuValue, // ใช้ SKU เป็น ID
            name: nameValue,
            category: categoryValue,
            price: priceValue,
            imageBase64: imageBase64Value // ใช้ Base64
        };

        if (idValue) {
            // แก้ไขสินค้าเดิม
            const index = menuItems.findIndex(item => item.id === idValue);
            if (index !== -1) {
                // ให้ใช้ SKU เดิม ในกรณีที่ผู้ใช้ไม่ได้เปลี่ยน
                menuItems[index] = { ...menuItems[index], ...newProduct, id: idValue }; 
                alert(`✅ แก้ไขสินค้า "${nameValue}" สำเร็จ!`);
            }
        } else {
            // เพิ่มสินค้าใหม่
            menuItems.push(newProduct);
            alert(`✅ เพิ่มสินค้า "${nameValue}" สำเร็จ!`);
        }

        saveProducts(); // บันทึกและรีเรนเดอร์รายการ
        clearForm();
    };

    /** จัดการการแก้ไข (โหลดข้อมูลเข้าฟอร์ม) */
    const handleEdit = (e) => {
        const idToEdit = e.currentTarget.dataset.id;
        const item = menuItems.find(i => i.id === idToEdit);

        if (item) {
            // ตั้งค่า ID ปัจจุบัน (สำหรับระบุว่ากำลังแก้ไข)
            productId.value = item.id;
            
            // ตั้งค่าค่าในฟอร์ม
            productName.value = item.name;
            productCategory.value = item.category;
            productPrice.value = item.price;
            productSku.value = item.id;
            productImageBase64.value = item.imageBase64; // ตั้งค่า Base64 เดิม
            
            // อัปเดต UI
            updateImagePreview(item.imageBase64);
            productSku.disabled = true; // ล็อค SKU ไม่ให้แก้ไข
            saveProductBtn.textContent = 'บันทึกการแก้ไข';
            cancelEditBtn.style.display = 'inline-block';

            // เลื่อนไปที่ฟอร์ม
            productForm.scrollIntoView({ behavior: 'smooth' });
        }
    };
    
    /** จัดการการลบสินค้า */
    const handleDelete = (e) => {
        const idToDelete = e.currentTarget.dataset.id;
        const item = menuItems.find(i => i.id === idToDelete);

        if (item && confirm(`❓ คุณต้องการลบสินค้า "${item.name}" (SKU: ${item.id}) หรือไม่?`)) {
            menuItems = menuItems.filter(i => i.id !== idToDelete);
            saveProducts();
            clearForm();
            alert(`✅ ลบสินค้า "${item.name}" สำเร็จ!`);
        }
    };


    // ----------------------------------------
    // 4. Initialization
    // ----------------------------------------
    
    // Preview รูปภาพทันทีที่เลือกไฟล์
    productImageFile.addEventListener('change', () => {
        const file = productImageFile.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // บันทึก Base64 ลงใน hidden input ทันทีที่มีการเลือกไฟล์ใหม่
                productImageBase64.value = e.target.result; 
                updateImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            // ถ้าไม่มีไฟล์เลือก ให้ใช้ Base64 เดิม (ถ้ามี)
            updateImagePreview(productImageBase64.value);
        }
    });

    productForm.addEventListener('submit', handleFormSubmit);
    cancelEditBtn.addEventListener('click', clearForm);

    loadProducts();
    renderProductList();

})();