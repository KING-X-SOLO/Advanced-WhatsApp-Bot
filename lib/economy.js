// lib/economy.js

/**
 * نظام الاقتصاد المتقدم
 * يتضمن وظائف لإدارة العملات، البنك، والمخزون
 */

// ============================================================
// 1. وظائف العملات الأساسية
// ============================================================

/**
 * إضافة عملة (Coin) للمستخدم
 * @param {string} jid - معرف المستخدم
 * @param {number} amount - الكمية المراد إضافتها
 */
export function addCoin(jid, amount) {
    if (global.db.data.users[jid]) {
        global.db.data.users[jid].coin = (global.db.data.users[jid].coin || 0) + amount;
    }
}

/**
 * سحب عملة (Coin) من المستخدم
 * @param {string} jid - معرف المستخدم
 * @param {number} amount - الكمية المراد سحبها
 * @returns {boolean} - true إذا تم السحب بنجاح، false إذا لم يكن الرصيد كافياً
 */
export function removeCoin(jid, amount) {
    if (global.db.data.users[jid] && global.db.data.users[jid].coin >= amount) {
        global.db.data.users[jid].coin -= amount;
        return true;
    }
    return false;
}

/**
 * تحويل عملة من رصيد المستخدم إلى البنك
 * @param {string} jid - معرف المستخدم
 * @param {number} amount - الكمية المراد تحويلها
 * @returns {boolean} - true إذا تم التحويل بنجاح، false إذا لم يكن الرصيد كافياً
 */
export function deposit(jid, amount) {
    if (global.db.data.users[jid] && global.db.data.users[jid].coin >= amount) {
        global.db.data.users[jid].coin -= amount;
        global.db.data.users[jid].bank = (global.db.data.users[jid].bank || 0) + amount;
        return true;
    }
    return false;
}

/**
 * سحب عملة من البنك إلى رصيد المستخدم
 * @param {string} jid - معرف المستخدم
 * @param {number} amount - الكمية المراد سحبها
 * @returns {boolean} - true إذا تم السحب بنجاح، false إذا لم يكن الرصيد كافياً في البنك
 */
export function withdraw(jid, amount) {
    if (global.db.data.users[jid] && global.db.data.users[jid].bank >= amount) {
        global.db.data.users[jid].bank -= amount;
        global.db.data.users[jid].coin = (global.db.data.users[jid].coin || 0) + amount;
        return true;
    }
    return false;
}

// ============================================================
// 2. وظائف المخزون والموارد
// ============================================================

/**
 * إضافة عنصر إلى مخزون المستخدم
 * @param {string} jid - معرف المستخدم
 * @param {string} item - اسم العنصر
 * @param {number} amount - الكمية المراد إضافتها
 */
export function addItem(jid, item, amount) {
    if (global.db.data.users[jid] && global.db.data.users[jid].inventory) {
        global.db.data.users[jid].inventory[item] = (global.db.data.users[jid].inventory[item] || 0) + amount;
    }
}

/**
 * إزالة عنصر من مخزون المستخدم
 * @param {string} jid - معرف المستخدم
 * @param {string} item - اسم العنصر
 * @param {number} amount - الكمية المراد إزالتها
 * @returns {boolean} - true إذا تم الإزالة بنجاح، false إذا لم يكن العنصر كافياً
 */
export function removeItem(jid, item, amount) {
    if (global.db.data.users[jid] && global.db.data.users[jid].inventory && global.db.data.users[jid].inventory[item] >= amount) {
        global.db.data.users[jid].inventory[item] -= amount;
        return true;
    }
    return false;
}

// ============================================================
// 3. وظائف الخبرة والمستوى
// ============================================================

/**
 * إضافة نقاط خبرة (EXP) للمستخدم
 * @param {string} jid - معرف المستخدم
 * @param {number} amount - الكمية المراد إضافتها
 */
export function addExp(jid, amount) {
    if (global.db.data.users[jid]) {
        global.db.data.users[jid].exp = (global.db.data.users[jid].exp || 0) + amount;
        checkLevelUp(jid);
    }
}

/**
 * التحقق من رفع مستوى المستخدم
 * @param {string} jid - معرف المستخدم
 */
export function checkLevelUp(jid) {
    const user = global.db.data.users[jid];
    if (!user) return;

    const currentLevel = user.level || 0;
    const currentExp = user.exp || 0;
    const requiredExp = 100 * (currentLevel + 1); // مثال: 100 لـ Level 1، 200 لـ Level 2، وهكذا

    if (currentExp >= requiredExp) {
        user.level += 1;
        // يمكن إضافة مكافآت هنا
        return true;
    }
    return false;
}
