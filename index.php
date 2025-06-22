<?php
$hwid = $_GET['hwid'] ?? '';

if (empty($hwid)) {
    http_response_code(400);
    echo json_encode(['error' => 'HWID required']);
    exit;
}

$week = date('W-Y');
$secret = 'vadrifts.byp_';

$key = substr(md5($hwid . $week . $secret), 0, 12);

$expires = strtotime('next sunday 23:59:59');

header('Content-Type: application/json');
echo json_encode([
    'key' => $key,
    'expires' => $expires,
    'week' => $week
]);
?>
