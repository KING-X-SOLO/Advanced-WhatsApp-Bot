// lib/store.js
// تم إزالة makeInMemoryStore والاعتماد على تخزين Baileys الافتراضي
// Baileys v6+ لا يتطلب makeInMemoryStore بشكل صريح إذا تم استخدام MultiFileAuthState
// سنقوم بتوفير وظيفة loadMessage بسيطة بدلاً من ذلك

import { jidNormalizedUser } from '@whiskeysockets/baileys'

// وظيفة وهمية لتحميل الرسائل، حيث أن Baileys الحديث يعتمد على التخزين التلقائي
// في حالة عدم وجود تخزين مخصص، يمكن تركها فارغة أو إرجاع لا شيء
const store = {
    loadMessage: async (jid, id) => {
        // يمكن إضافة منطق لتحميل الرسائل من قاعدة البيانات (lowdb) هنا إذا لزم الأمر
        // حالياً، سنعتمد على Baileys لتخزين الرسائل مؤقتاً
        return null
    }
}

export default store
