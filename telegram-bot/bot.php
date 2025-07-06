<?php
require_once 'config.php';

// Telegram Bot API
$botToken = 'YOUR_BOT_TOKEN';
$apiURL = "https://api.telegram.org/bot{$botToken}/";

// Get incoming message
$content = file_get_contents("php://input");
$update = json_decode($content, true);

if (isset($update['message'])) {
    $chatId = $update['message']['chat']['id'];
    $messageText = $update['message']['text'];
    $userId = $update['message']['from']['id'];
    
    // Check if user is admin
    $isAdmin = checkAdminStatus($userId);
    
    if ($messageText == '/start') {
        if (isset($_GET['anon_person']) && isset($_GET['order_id'])) {
            // Handle order tracking
            $anonId = $_GET['anon_person'];
            $orderId = $_GET['order_id'];
            handleOrderTracking($chatId, $anonId, $orderId);
        } else {
            sendWelcomeMessage($chatId, $isAdmin);
        }
    } elseif ($isAdmin) {
        handleAdminCommands($chatId, $messageText);
    } else {
        sendMessage($chatId, "Sizda admin huquqlari yo'q.");
    }
}

function checkAdminStatus($telegramId) {
    global $pdo;
    
    $stmt = $pdo->prepare("SELECT is_admin FROM users WHERE telegram_id = ? AND is_admin = TRUE");
    $stmt->execute([$telegramId]);
    
    return $stmt->rowCount() > 0;
}

function sendWelcomeMessage($chatId, $isAdmin) {
    $message = $isAdmin ? 
        "Salom Admin! Buyurtmalarni boshqarish uchun /orders buyrug'ini yuboring." :
        "Salom! Buyurtmangizni kuzatish uchun maxsus havoladan foydalaning.";
    
    sendMessage($chatId, $message);
}

function handleAdminCommands($chatId, $messageText) {
    if ($messageText == '/orders') {
        showPendingOrders($chatId);
    } elseif (strpos($messageText, '/complete_') === 0) {
        $orderId = str_replace('/complete_', '', $messageText);
        updateOrderStatus($orderId, 'completed');
        sendMessage($chatId, "Buyurtma #{$orderId} bajarilgan deb belgilandi.");
    } elseif (strpos($messageText, '/cancel_') === 0) {
        $orderId = str_replace('/cancel_', '', $messageText);
        updateOrderStatus($orderId, 'cancelled');
        sendMessage($chatId, "Buyurtma #{$orderId} bekor qilindi.");
    }
}

function showPendingOrders($chatId) {
    global $pdo;
    
    $stmt = $pdo->prepare("
        SELECT o.id, o.full_name, o.phone, o.address, b.title, o.total_amount, o.created_at
        FROM orders o
        JOIN books b ON o.book_id = b.id
        WHERE o.status = 'pending'
        ORDER BY o.created_at DESC
        LIMIT 10
    ");
    $stmt->execute();
    $orders = $stmt->fetchAll();
    
    if (empty($orders)) {
        sendMessage($chatId, "Yangi buyurtmalar yo'q.");
        return;
    }
    
    $message = "📋 Yangi buyurtmalar:\n\n";
    foreach ($orders as $order) {
        $message .= "🆔 #{$order['id']}\n";
        $message .= "📚 {$order['title']}\n";
        $message .= "👤 {$order['full_name']}\n";
        $message .= "📞 {$order['phone']}\n";
        $message .= "📍 {$order['address']}\n";
        $message .= "💰 " . number_format($order['total_amount']) . " so'm\n";
        $message .= "📅 " . date('d.m.Y H:i', strtotime($order['created_at'])) . "\n";
        $message .= "━━━━━━━━━━━━━━━━━━━━\n\n";
    }
    
    sendMessage($chatId, $message);
    
    // Send action buttons for each order
    foreach ($orders as $order) {
        $keyboard = [
            [
                ['text' => '✅ Bajarildi', 'callback_data' => "complete_{$order['id']}"],
                ['text' => '❌ Bekor qilish', 'callback_data' => "cancel_{$order['id']}"]
            ]
        ];
        
        sendMessageWithKeyboard($chatId, "Buyurtma #{$order['id']} uchun amal tanlang:", $keyboard);
    }
}

function updateOrderStatus($orderId, $status) {
    global $pdo;
    
    $stmt = $pdo->prepare("UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$status, $orderId]);
}

function handleOrderTracking($chatId, $anonId, $orderId) {
    global $pdo;
    
    $stmt = $pdo->prepare("
        SELECT o.*, b.title, b.author
        FROM orders o
        JOIN books b ON o.book_id = b.id
        WHERE o.id = ? AND o.anon_temp_id = ?
    ");
    $stmt->execute([$orderId, $anonId]);
    $order = $stmt->fetch();
    
    if (!$order) {
        sendMessage($chatId, "Buyurtma topilmadi.");
        return;
    }
    
    $statusText = [
        'pending' => '⏳ Kutilmoqda',
        'processing' => '🔄 Tayyorlanmoqda',
        'completed' => '✅ Bajarilgan',
        'cancelled' => '❌ Bekor qilingan'
    ];
    
    $message = "📋 Buyurtma ma'lumotlari:\n\n";
    $message .= "🆔 #{$order['id']}\n";
    $message .= "📚 {$order['title']}\n";
    $message .= "✍️ {$order['author']}\n";
    $message .= "📊 Holat: {$statusText[$order['status']]}\n";
    $message .= "💰 Summa: " . number_format($order['total_amount']) . " so'm\n";
    $message .= "📅 Buyurtma sanasi: " . date('d.m.Y H:i', strtotime($order['created_at']));
    
    if ($order['delivery_date']) {
        $message .= "\n🚚 Yetkazib berish: " . date('d.m.Y H:i', strtotime($order['delivery_date']));
    }
    
    sendMessage($chatId, $message);
}

function sendMessage($chatId, $text) {
    global $apiURL;
    
    $data = [
        'chat_id' => $chatId,
        'text' => $text,
        'parse_mode' => 'HTML'
    ];
    
    file_get_contents($apiURL . "sendMessage?" . http_build_query($data));
}

function sendMessageWithKeyboard($chatId, $text, $keyboard) {
    global $apiURL;
    
    $data = [
        'chat_id' => $chatId,
        'text' => $text,
        'reply_markup' => json_encode(['inline_keyboard' => $keyboard])
    ];
    
    file_get_contents($apiURL . "sendMessage?" . http_build_query($data));
}

// Handle new order notification
function notifyAdminsNewOrder($orderId) {
    global $pdo, $apiURL;
    
    // Get admin telegram IDs
    $stmt = $pdo->prepare("SELECT telegram_id FROM users WHERE is_admin = TRUE AND telegram_id IS NOT NULL");
    $stmt->execute();
    $admins = $stmt->fetchAll();
    
    // Get order details
    $stmt = $pdo->prepare("
        SELECT o.*, b.title, b.author
        FROM orders o
        JOIN books b ON o.book_id = b.id
        WHERE o.id = ?
    ");
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    
    if (!$order) return;
    
    $message = "🔔 Yangi buyurtma!\n\n";
    $message .= "🆔 #{$order['id']}\n";
    $message .= "📚 {$order['title']}\n";
    $message .= "👤 {$order['full_name']}\n";
    $message .= "📞 {$order['phone']}\n";
    $message .= "📍 {$order['address']}\n";
    $message .= "💰 " . number_format($order['total_amount']) . " so'm";
    
    foreach ($admins as $admin) {
        sendMessage($admin['telegram_id'], $message);
    }
}
?>
