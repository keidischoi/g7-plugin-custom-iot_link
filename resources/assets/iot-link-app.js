/*! custom-iot_link 1.19.11 — 📡 IoT 연결 (Home Assistant · SmartThings · Matter 온습도 · 기기 상태 받기) 화면 · 관리자 */
(function () {
  'use strict';
  // 🌐 화면 글자 사전 — en 에 없으면 ko
  var T = {
   ko: {
    sign_in_required: "로그인이 필요해요.",
    request_failed: "요청에 실패했어요.",
    no_value_received_yet: "아직 받은 값이 없어요",
    just_now: "방금",
    min_ago: "분 전",
    h_ago: "시간 전",
    d_ago: "일 전",
    and: '<li class="more">… 그 밖에 ',
    more: "개</li>",
    storage_box: "보관함",
    printer: "프린터",
    equipment: "장비",
    not_attached_yet: "아직 붙인 곳 없음",
    choose_where_to_attach: "붙일 곳 정하기",
    the_attached_place_is: "붙인 곳이 없어졌어요",
    title_click_to_choose: '" title="눌러서 붙일 곳 고르기">',
    change: "바꾸기",
    company: "업체",
    personal: "👤 개인",
    company_devices_can_only: "🏢 업체 기기는 그 업체 대표 · 관리자만 옮길 수 있어요.",
    attach_to: "」 붙일 곳",
    edit_details: '<button type="button" class="hal-btn sm" data-pp-edit>✏️ 자세히 고치기</button>',
    here_now: "✅ 지금 여기",
    nowhere_to_attach_create: '<p class="hal-hint">붙일 곳이 없어요 — 재고 관리에서 보관함을 만들거나 프린터 라운지에서 프린터를 넣어 주세요.</p>',
    detach_to_waiting_area: '<button type="button" class="hal-btn sm" data-pp-free>📡 떼서 대기 칸으로</button>',
    printer_lounge: '<a class="hal-btn sm" href="/my-printer" data-go>🖨️ 프린터 라운지 →</a>',
    waiting_for_values: '<span class="hal-dot wait"></span>값을 기다리는 중',
    the_3ds_mqtt_relay: "3ds MQTT 중계가 값을 안 보내요 — 그 PC 와 MQTT 브로커가 켜져 있는지 · 센서가 값을 올리는지 봐 주세요 (다시 보내면 저절로 풀려요)",
    the_3ds_matter_link: "3ds Matter 연결이 값을 안 보내요 — 그 PC · 라즈베리파이와 Matter 서버가 켜져 있는지 봐 주세요 (다시 보내면 저절로 풀려요)",
    smartthings_hasn_t_sent: "SmartThings 가 값을 안 보냈어요 — 사이트가 15분마다 저절로 지금 값을 물어 다시 이어요 (바로 하려면 「🔄 다시 잇기」 · 기기가 꺼져 있으면 켜진 뒤 저절로)",
    home_assistant_isn_t: "Home Assistant 가 값을 안 보내요 — HA 가 켜져 있고 인터넷에 이어져 있는지 봐 주세요 (다시 보내면 저절로 풀려요)",
    disconnected: '"></span>끊김 · ',
    please_check_drying_for: "여기 둔 필라멘트 건조를 챙겨 주세요",
    over_the_threshold: "기준을 넘었어요",
    title_threshold: ' title="기준 ',
    input_type_checkbox_data: '<label class="hal-pick" title="고르기"><input type="checkbox" data-sel="',
    select: ' 고르기"></label>',
    s: '<button type="button" class="hal-icobtn pri" data-revive title="🔄 다시 잇기" aria-label="다시 잇기">🔄</button>',
    title_config_text_home: '" title="📋 설정 글 (Home Assistant)" aria-label="설정 글">📋</button>',
    title_edit_aria_label: '" title="고치기" aria-label="고치기">✏️</button></span></header>',
    s_30_days: "30일 ",
    h: '시간"><i aria-hidden="true">',
    running: "가동 중",
    idle: "쉬는 중",
    over_threshold: '">⚠️ 기준 넘음</span>',
    title_view_larger: '" title="크게 보기"><span>📷 ',
    public: "🌐 공개",
    only_me: "🔒 나만",
    photo: "📷 사진 · ",
    sensors: "📋 센서 ",
    s_2: "개",
    my_printers_my_equipment: "내 프린터 · 내 장비",
    personal_inventory: "개인 재고",
    my_filament_resin_storage: "내 필라멘트 · 레진 보관함",
    company_equipment_company_printers: "업체 장비 · 업체 프린터 · 업체 재고",
    uncategorized: "미분류",
    sensors_not_categorized_yet: "아직 분류하지 않은 센서",
    auto_follows_attached_place: '<option value="">🔄 자동 (붙인 곳 따라',
    cards: "카드",
    banner: "배너",
    single_line: "한 줄",
    board: "보드",
    buy: "센서 ",
    sensors_2: "개 사기 · ",
    this_quantity_can_t: "이 개수는 살 수 없어요",
    s_3: '<i class="c on" title="쓰는 칸"></i>',
    unlimited_admin_used: "</b><small>무제한 (관리자) · 사용 <b>",
    slots: "</b>칸",
    purchased: " · 💳 구매 ",
    slots_2: "칸",
    s_4: '<span class="c inf" title="관리자는 한도가 없어요">∞</span></div></div>',
    purchased_slots: "💳 구매한 칸",
    base_slots: "기본 칸",
    in_use: "쓰는 중",
    left: "남음",
    s_5: '<i class="c over on" title="한도를 넘어 붙어 있는 기기"></i>',
    s_6: '<button type="button" class="c add" data-slot-add title="칸 더 사기">＋</button>',
    total: "</b><small>전체 <b>",
    slots_base: "</b>칸 (기본 ",
    purchased_2: " + 💳 구매 ",
    used: ") · 사용 <b>",
    left_2: "</b> · 남은 <b>",
    over: "칸 넘음</span>",
    buy_more_slots: "칸 더 사기",
    slot_not_available_yet: "아직 없는 칸",
    monthly_billing_auto_renew: "달마다 결제 (자동 연장 · 끄면 기한까지)",
    buy_once_keep_forever: "한 번 사면 계속",
    free_slots_used_slots: '<p class="hal-gauge-k"><i class="c"></i>남은 칸 <i class="c on"></i>쓰는 칸 <i class="c buy"></i>💳 구매한 칸',
    not_on_sale_now: " · 지금은 팔지 않아요",
    admins_are_exempt_from: "관리자는 기기 수 한도에서 빠져서 칸을 살 필요가 없어요. 아래는 지금까지 구매한 칸이에요.",
    sensor_slots_aren_t: "지금은 센서 칸을 팔지 않아요. 아래는 지금까지 구매한 칸이에요.",
    to_attach_more_sensors: '<p class="hal-hint">기기 수 한도를 넘어 센서를 더 붙이려면 칸을 사요 — <b>',
    when_slots_expire_attached: "</b>. 칸이 끝나도 붙인 기기는 지우지 않아요 (새로 붙이는 것만 막혀요).</p>",
    use_for: "<label>어디에 쓸까요<select data-slot-for>",
    my_balance: "내 잔액 ",
    data_go_top_up: '" data-go>충전하기 →</a>',
    s_7: "개 ",
    per_item: " (1개당 ",
    aria_label_one_less: '" aria-label="하나 빼기">−</button><input type="number" min="1" max="',
    aria_label_quantity_to: '" aria-label="살 개수"><button type="button" class="hal-btn sm" data-qty-step="1" data-cur="',
    aria_label_one_more: '" aria-label="하나 더하기">＋</button></span>',
    no_payment_method_available: '<p class="hal-warn">지금 쓸 수 있는 결제 수단이 없어요 (코인 · 마일리지 확장이 꺼져 있거나 값이 정해지지 않았어요).</p>',
    purchased_slots_2: '<h4 class="hal-slot-t">구매한 칸</h4><ul class="hal-slotl">',
    until: "까지",
    active: "🟢 계속",
    cancelled: "↩️ 취소함",
    ended: "⚪ 끝남",
    sensors_3: " · 센서",
    title_cancel_up_to: '" title="안 쓴 칸 ',
    unused_slots_get_back: "개까지 취소 · 낸 값의 몫을 돌려받아요 (산 뒤 ",
    days_of_purchase_cancel: '일 안)">↩️ 취소</button>',
    can_t_cancel: '<small class="hal-mute">취소 못 함 — ',
    auto_renew: "> 자동 연장</label>",
    purchased_sensor_slots: "💳 구매한 센서 칸",
    add_sensor_slots: "💳 센서 칸 늘리기",
    how_many_to_cancel: "몇 개를 취소할까요? (안 쓴 칸 ",
    unused_slots: "개까지)",
    please_enter_a_number: " 사이로 적어 주세요.",
    cancel_1_sensor_slot: "센서 칸 1개를 취소할까요? 낸 값을 돌려받아요.",
    buy_2: "사기 · ",
    buy_it: " 을(를) 살까요?",
    needed: "\n(필요 ",
    my_balance_2: " · 내 잔액 ",
    go_top_up: "\n\n충전하러 갈까요?",
    show_more: '<button type="button" class="hal-btn hal-more-btn" data-more-btn>더 보기</button>',
    relay_install_one_line: " 중계 설치 <small>한 줄 · 따로 깔 것 없음</small></h4>",
    windows_button_type_button: '">🪟 윈도우</button><button type="button" role="tab" data-mt-os="sh" class="',
    linux_mac_raspberry_pi: '">🐧 리눅스 · 🍎 맥 · 🍓 라즈베리파이</button></div>',
    matter_server_address_for: '<label>Matter 서버 주소 <small>HA 의 Matter Server 애드온이면 HA 의 IP · 비우면 설치 때 물어봐요</small><input data-mt-addr value="',
    placeholder_e_g_192: '" placeholder="예: 192.168.0.10" autocapitalize="off" autocomplete="off" spellcheck="false"></label>',
    terminal: "터미널",
    copy_new: '</code><button type="button" class="hal-btn sm pri" data-mt-cp>📋 복사</button><button type="button" class="hal-btn sm" data-rl-any title="이 한 줄(연결 코드)을 바꿔요 — 옛 한 줄은 바로 막혀요">🔑 새로</button></div>',
    open_a_terminal_ssh: "<b>터미널</b> 열기 (라즈베리파이는 SSH 도 돼요)",
    start_open_powershell: "시작 › <b>PowerShell</b> 열기",
    s_2_paste_and_press: "</li><li><em>2</em>붙여 넣고 Enter</li><li><em>3</em>공유 코드 적기 (건너뛰어도 돼요)</li></ol>",
    on_an_always_on: '<p class="hal-hint">늘 켜 두는 기기에 · 켤 때마다 저절로 시작해요',
    python3_standard_library_only: " (python3 기본 기능만 · systemd · crontab · 맥은 launchd)",
    the_line_contains_your: ". 🔒 한 줄에 내 연결 코드가 들어 있어요 (남에게 보이지 마세요).</p></section>",
    company_2: "업체 ",
    no_server_name_older: "서버 이름 없음 (예전 통합)",
    no_name: "이름 없음",
    matter_3ds_link: "Matter (3ds 연결)",
    app_relay_tab: "앱 · 프로그램 중계",   // 1.18.0 📱 · 1.19.2 🏢
    trader_how: '<div class="hal-mtg-apps" style="margin-top:10px"><div><b>🏢 3DS Trader</b><span>폰 대신 회사 PC 가 보내요 — 연결 프로그램(MQTT 중계)을 따로 깔 필요 없어요</span></div><div><b>① ⚙ 도구 › 옵션 › 📡 중계</b><span>프로그램에 로그인한 계정의 IoT 연결 코드를 저절로 받아 와요</span></div><div><b>② 📨 「매장 안 MQTT 브로커의 온습도 센서도 사이트로 보내기」 켜기</b><span>브로커 · 토픽은 이 화면 MQTT · BT 탭 설정 그대로 · 🏢 회사 프린터 상태도 같이</span></div><div><b>③ 💾 저장 · 켜 두기</b><span>옵션 › 🖥️ 일반의 「윈도우 시작할 때 켜기」 · 「알림 영역에 숨기기」를 켜 두면 늘 보내요</span></div></div>',   // 1.19.2 🏢
    app_relay_card: '</span><div><h2>📱 앱 중계 <small>3D SUEÑO 안드로이드 앱 · PC 없이</small></h2><p>집 와이파이에 둔 안드로이드 폰이 PC 연결 프로그램 대신 <b>프린터 상태</b>와 <b>📨 MQTT 센서 값</b>을 이 사이트로 보내요. 충전기에 꽂아 둔 남는 폰이면 좋아요.</p></div>',
    app_relay_how: '<div class="hal-mtg-apps"><div><b>① 앱 › 내 프린터 › 📡 중계 모드</b><span>3D SUEÑO 앱에 로그인한 폰</span></div><div><b>② 프린터 · 📨 IoT 센서 켜기</b><span>프린터는 「이 폰으로 중계」 · 센서는 「같이 중계」 (브로커 · 토픽은 MQTT · BT 탭 설정 그대로)</span></div><div><b>③ ▶ 켜기 · 📶 절전 막기</b><span>알림이 떠 있는 동안 보내요 · 배터리 최적화에서 빼 주세요</span></div><div><b>💾 백업</b><span>설정은 사이트에 암호화해 맡겨요 — 폰을 바꾸면 저절로 불러와요</span></div></div><p class="hal-hint">🏠 폰이 집 밖이면 쉬고, 돌아오면 저절로 이어요 · 🔀 PC 가 보내는 프린터는 PC 가 먼저 · 📶 블루투스 · 🧩 Matter · 📤 출력 파일 보내기는 PC 만 · 🏠 홈어시스턴트 · 🔷 SmartThings 는 중계가 필요 없어요</p>',
    app_relay_none: '<p class="hal-hint">아직 앱으로 중계하는 폰이 없어요.</p>',
    app_relay_phones: "중계하는 폰",
    app_relay_away: "🏠 집 밖이라 쉬는 중",
    app_relay_sensors: "📨 MQTT 센서",
    app_relay_printers: "🖨️ 프린터",
    mqtt_bt_3ds_relay: "MQTT · BT (3ds 중계)",
    source: ' 에서 옴">',
    title_source_device_attached: '" title="받는 곳 → 기기 → 붙인 곳 → 이어지는 확장">🗺️ 연결 지도</button>',
    button_type_button_role: '<div class="hal-scope" role="tablist" aria-label="보기"><button type="button" role="tab" data-scope="all" class="',
    devices: '">📡 기기 <small>',
    button_type_button_role_2: '<div class="hal-scope" role="tablist" aria-label="기기 범위"><button type="button" role="tab" data-scope="all" class="',
    all: '">📡 전체 <small>',
    my_devices: '">👤 내 기기 <small>',
    company_devices: '">🏢 업체 기기 <small>',
    s_8: '<div class="hal-gf hal-cos" role="tablist" aria-label="업체">',
    all_companies: "모든 업체",
    devices_attached_to_company: '<p class="hal-hint">🏢 업체 장비 · 업체 프린터에 붙인 기기 — 그 업체 대표 · 관리자가 함께 고치고, 직원은 보기만 해요. 기록 보관은 🏢 내 업체 › 📡 IoT 연결 칸에서 더 짧게 정할 수 있어요.</p>',
    s_9: '<div class="hal-gf hal-src" role="tablist" aria-label="출처">',
    all_sources: "모든 출처",
    all_2: "전체",
    s_10: '<div class="hal-gf hal-srv" role="tablist" aria-label="HA 서버">',
    all_ha_servers: "모든 HA 서버",
    s_11: '<div class="hal-gf" role="tablist" aria-label="분류">',
    s_12: '<div class="hal-views" role="group" aria-label="보기 모양">',
    view: '로 보기"><i aria-hidden="true">',
    title_devices_allowed_per: '" title="업체 하나에 둘 수 있는 기기 (회원 모두 합쳐 ',
    company_3: '개)">업체 ',
    all_3: "모두",
    connected: "🟢 연결",
    connected_2: "연결된 것",
    disconnected_2: "📴 끊김",
    disconnected_3: "끊긴 것",
    over_2: "⚠️ 넘음",
    over_threshold_2: "기준을 넘은 것",
    waiting: "⏳ 대기",
    waiting_for_values_2: "값을 기다리는 것",
    name: "가나다순",
    recent_activity: "최근 소식순",
    highest_humidity: "습도 높은순",
    highest_temperature: "온도 높은순",
    problems_first: "문제 먼저",
    order_added: "넣은 순",
    s_13: '<select class="hal-gsort" data-gsort aria-label="정렬">',
    none: "이 없어요",
    only: "만 보기",
    filter: ' 거르기">',
    no_devices_match_these: '<p class="hal-hint">이 조건에 맞는 기기가 없어요.</p>',
    s_14: '<div class="hal-more" data-more aria-label="더 불러오는 중"><span></span><span></span><span></span></div>',
    all_4: "> 모두</label>",
    disconnected_only: '<button type="button" class="hal-btn sm" data-sel-stale>끊긴 것만 (',
    selected_select_class_hal: '개 골랐어요</span><select class="hal-sel-grp" data-sel-grp',
    aria_label_move_selected: ' aria-label="고른 기기 분류 옮기기"><option value="-">📁 분류 옮기기…</option>',
    auto_follows_attached_place_2: '<option value="">🔄 자동 (붙인 곳 따라)</option></select><button type="button" class="hal-btn sm danger" data-sel-del',
    delete_cancel: '개 지우기</button><button type="button" class="hal-btn sm" data-sel-off>취소</button></div>',
    above: " 넘으면",
    below: " 밑이면",
    no_alert: "안 알림",
    humidity: "습도 ",
    low: "낮음",
    high: "높음",
    temp: "온도 ",
    out_of_range: "구간 밖",
    sensor: " 센서가 없어요.</p>",
    view_only: " <small>(보기만)</small>",
    placeholder_no_minimum_input: '" placeholder="아래 없음"> <span>~</span> <input type="number" data-r="',
    placeholder_no_maximum: '" placeholder="위 없음"> <b>',
    alerts_when_the_value: '<p class="hal-hint">이 구간을 벗어나면(위로 넘거나 아래로 내려가면) 알려요. 칸을 비우면 그쪽은 보지 않아요.</p>',
    humidity_2: "💧 습도",
    dry_20: "건조함 ~20%",
    alerts_off: "알림 끔",
    temperature: "🌡️ 온도",
    alert_range: "🔔 알림 구간",
    save: "저장",
    the_lower_value_must: "아래 값은 위 값보다 작아야 해요.",
    more_see_all_in: "개 더 — 재고 관리에서 모두 보기",
    resin: "레진",
    filament: "필라멘트",
    left_3: " · 남은 ",
    new_unopened_roll: " · 안 뜯은 새 롤",
    title_click_to_set: ' title="🔔 누르면 알림 구간(아래 · 위) 정하기 — 🌡️ ',
    no_temperature_sensor: "온도 센서 없음",
    no_humidity_sensor: "습도 센서 없음",
    empty: "<u>빈 칸</u>",
    title_drag_onto_the: '" title="위 👤 · 🏢 탭으로 끌면 통째로 옮겨요"',
    location_not_in_inventory: "재고 관리에 없는 위치",
    inventory_storage_box: "재고 관리 보관함",
    empty_2: "비었어요",
    sensor_only: "센서만",
    storage_location: "보관 위치",
    drop_a_sensor_here: '<small class="hal-drop-hint">＋ 센서를 여기로</small>',
    only_the_company_s: "업체 대표 · 관리자만 옮길 수 있어요",
    drag_and_drop_or: "끌어서 놓거나 · 누르고 놓을 곳을 누르세요",
    status: "상태",
    temperature_2: "온도",
    humidity_3: "습도",
    equipment_value: " (장비 값)",
    empty_3: " — 비어 있음",
    empty_4: "<small>비어 있음</small>",
    drag_here: '<small class="hal-hint">여기로 끌어 놓기</small>',
    link_off: " · 연결 꺼짐",
    no_sensor: "센서 없음",
    connected_3: "연결됨",
    link_off_2: "연결 꺼짐",
    printing: "출력 중",
    paused: "일시정지",
    finished: "끝남",
    failed: "실패",
    linked_to_company_equipment: "🏭 업체 장비와 이어짐",
    s_15: '"><button type="button" class="hal-sc l" data-sc="-1" aria-label="왼쪽으로"><i aria-hidden="true"></i></button><div class="hal-bins hal-strip">',
    s_16: '</div><button type="button" class="hal-sc r" data-sc="1" aria-label="오른쪽으로"><i aria-hidden="true"></i></button></div>',
    s_17: '<span class="hal-own co" title="업체 것">🏢 ',
    personal_2: '<span class="hal-own me" title="내 것">👤 개인</span>',
    move_to_personal_another: "개인 · 다른 업체로 옮기기",
    move_to_company: "업체로 옮기기",
    with_filament_sensors_aria: ' (필라멘트 · 센서 같이)" aria-label="옮기기">⇄</button>',
    title_rename_aria_label: '" title="이름 바꾸기" aria-label="이름 바꾸기">✏️</button>',
    sensors_to_waiting_area: "센서를 대기 칸으로",
    delete_storage_box: "보관함 지우기",
    aria_label_delete: '" aria-label="지우기">🗑</button>',
    no_storage_boxes: '<p class="hal-hint">보관함이 없어요',
    create_one_with_create: " — 「➕ 보관함 만들기」로 만들어요",
    data_board_drag_a: '" data-board><p class="hal-hint">센서 칩을 붙일 곳에 끌어 놓으세요 · 휴대폰은 칩을 누르고 놓을 곳을 눌러요. 줄이 길면 ‹ › 로 넘겨요 (끄는 중에 ‹ › 위에 대면 넘어가요). 보관함은 🌡️ 하나 · 💧 하나 — 겹치면 바꿔 끼우고 예전 센서는 대기 칸으로 가요.</p>',
    data_drop_waiting_area: '" data-drop=""><header><i aria-hidden="true">📡</i><b>대기 칸</b><small>',
    collapsed_drag_here_to: "개 — 접혀 있어요 (여기로 끌면 떼어져요)",
    sensors_not_attached_yet: "아직 붙이지 않은 센서 — 여기로 끌면 떼어져요",
    all_sensors_are_attached: '<small class="hal-hint">모든 센서가 붙어 있어요</small>',
    storage_boxes: '<h3 class="hal-bd-t k-box">📦 보관함',
    create_storage_box: '<button type="button" class="hal-btn sm" data-box-act="new">➕ 보관함 만들기</button>',
    printers: '<h3 class="hal-bd-t k-printer">🖨️ 프린터</h3>',
    company_equipment: '<h3 class="hal-bd-t k-equip">🏭 업체 장비</h3>',
    nowhere_to_move_it: "옮길 곳이 없어요 (이미 그쪽 보관함이에요).",
    to: "」을(를) ",
    move_it_whole_filament: "(으)로 통째로 옮길까요?\n안에 든 필라멘트 · 레진과 붙은 센서도 같이 옮겨져요.",
    it_will_count_toward: "\n업체 재고에 잡혀요.",
    a_storage_box_with: "\n\n⚠️ 그쪽에 같은 이름의 보관함이 있어서 하나로 합쳐요.",
    moved: "옮겼어요.",
    move: "」 옮기기",
    move_where: '<div class="hal-own-pick" role="radiogroup"><span>어디로 옮길까요?</span>',
    move_2: "옮기기",
    storage_box_name: '<label>보관함 이름<input type="text" data-bx-name maxlength="40" placeholder="예: 드라이박스 · 서랍 2칸"></label>',
    whose_storage_box: '<div class="hal-own-pick" role="radiogroup" aria-label="누구 보관함"><span>누구 보관함인가요?</span>',
    storage_box_2: " 보관함으로 만들어요.</p>",
    create_storage_box_2: "📦 보관함 만들기",
    create: "만들기",
    please_enter_a_storage: "보관함 이름을 넣어 주세요.",
    storage_box_created: "📦 보관함을 만들었어요.",
    new_name_the_storage: "」 새 이름 (롤 · 센서의 보관 위치도 같이 바뀌어요)",
    renamed: "이름을 바꿨어요.",
    has: "」에 롤이 ",
    rolls_move_them_in: "개 있어요 — 재고 관리에서 롤을 옮긴 뒤 지워 주세요.",
    move_3: "」의 센서 ",
    sensors_to_the_waiting: "개를 대기 칸으로 뺄까요?",
    delete_the_empty_storage: "빈 보관함 「",
    s_18: "」을(를) 지울까요?",
    attached_sensors: "\n붙은 센서 ",
    will_go_to_the: "개는 대기 칸으로 가요.",
    moved_the_sensors_to: "센서를 대기 칸으로 뺐어요.",
    personal_3: "개인",
    s_19: '<div class="hal-gf hal-mapf" role="tablist" aria-label="지도 범위">',
    relay_pc_sends_from: "중계 PC — 집 안에서 사이트로 보냄",
    printing_2: "🟢 출력 중",
    paused_2: "⏸ 일시정지",
    finished_2: "✅ 끝남",
    failed_2: "⚠️ 실패",
    printer_lounge_2: "프린터 라운지",
    print_status_ambient_temp: "출력 상태 · 주변 온습도",
    company_equipment_2: "업체 장비",
    equipment_status_temp_humidity: "장비 상태 · 온습도",
    receives_printer_status_via: "클라우드로 프린터 상태를 받음",
    printer_lounge_link_program: "프린터 라운지 연결 프로그램 — 프린터 ⇄ 사이트 (상태 · 원격 출력)",
    printer_lounge_link_program_2: "프린터 라운지 연결 프로그램 — PC 이름을 안 보내는 예전 판 (⚙ 의 한 줄을 다시 실행하면 그 PC 아래로)",
    running_2: "⚙️ 가동 중",
    idle_2: "⏸ 쉬는 중",
    home_assistant_home_sending: "<span><b>Home Assistant</b><small>3DSSync 통합이 보내요</small></span>",
    matter_matter_relay_matter: "<span><b>Matter</b><small>Matter 중계 — Matter 서버의 센서 → 사이트</small></span>",
    mqtt_bt_mqtt_relay: "<span><b>MQTT · BT</b><small>MQTT 중계 — 브로커의 토픽 · 블루투스 온습도계 → 사이트</small></span>",
    smartthings_cloud_sensors: "<span><b>SmartThings</b><small>클라우드 센서</small></span>",
    role_button_tabindex_0: '" role="button" tabindex="0" title="눌러서 고치기"',
    waiting_area: "대기 칸 ",
    not_attached_yet_2: "아직 붙이지 않음",
    storage_boxes_rolls: "보관함 · 롤 ",
    inventory: "재고 관리",
    storage_box_humidity_drying: "보관함 습도 · 건조일 · 알림",
    maintenance_log: "정비 수첩",
    runtime_maintenance: "가동 시간 → 정비 때",
    s_3ds_server: "3DS 서버",
    this_site_where_the: "이 사이트 — 중계 PC · HA · SmartThings 가 값을 보내는 곳",
    relay_pc: "중계 PC",
    source_2: "받는 곳",
    device: "기기",
    attached_to: "붙인 곳",
    linked_to: "이어지는 곳",
    a_green_line_means: '<div class="hal-map-wrap"><p class="hal-hint">선이 <b class="hal-map-k on">초록</b>이면 값이 들어오고, <b class="hal-map-k off">회색 점선</b>이면 끊겼거나 아직 값이 없어요. 마디에 마우스를 올리면 그 연결만 진하게 · 기기를 누르면 고치기 · 붙인 곳 · 이어지는 곳을 누르면 그 화면으로.</p>',
    delete_the: "고른 기기 ",
    selected_devices_temp_humidity: "개를 지울까요?\n온습도 기록 · 가동 시간 · 사진도 같이 지워지고 되돌릴 수 없어요. (SmartThings 센서는 고른 것에서 빠져요)",
    deleting: "지우는 중…",
    ai_suggestions: '<section class="hal-aip"><header><b>🤖 AI 제안 <small>',
    attached_only_when_you: "</small></b><span>눌러야 붙어요</span>",
    attach_all: '<button type="button" class="hal-btn sm" data-aip-all>✔ 모두 붙이기</button>',
    dismiss_all: '<button type="button" class="hal-btn sm ghost" data-aip-x="all">✕ 모두 버리기</button></header>',
    attach_button_type_button: '">✔ 붙이기</button><button type="button" class="hal-btn sm ghost" data-aip-x="',
    aria_label_dismiss: '" aria-label="버리기">✕</button></div>',
    iot_link_receives_temp: '<section class="hal-hero"><div><h1>📡 IoT 연결</h1><p>Home Assistant · SmartThings · Matter 의 온습도 센서 · 프린터 · 장비 상태를 받아 재고 관리 · 정비 수첩 · 내 프린터에 이어요.</p></div>',
    devices_2: '<div class="hal-stats"><span title="연결할 수 있는 기기 (관리자가 정함)">기기 <b>',
    admin_unlimited: ' <small title="관리자는 기기 수 한도가 없어요">· 관리자 무제한</small>',
    connected_4: "</span><span>🟢 연결됨 <b>",
    over_threshold_3: '<span class="hot">⚠️ 기준 넘음 <b>',
    how_to_connect: '<button class="hal-btn ghost" data-guide title="연결 방법 보기" aria-label="연결 방법 보기">❓ 연결 방법</button>',
    select_multiple: '<button class="hal-btn ghost" data-sel-on title="체크 박스로 골라 한 번에 분류 옮기기 · 지우기">☑️ 여러 개 고르기</button>',
    buy_sensor_slots_with: "코인 · 마일리지로 센서 칸 사기 · 구매한 칸 보기",
    view_cancel_purchased_sensor: "구매한 센서 칸 보기 · 취소",
    add_slots: "칸 늘리기",
    purchased_slots_3: "구매한 칸",
    connect_device: ' <button class="hal-btn light" data-new>➕ 기기 연결</button></div></section>',
    this_screen_fetches_new: "🔄 이 화면은 ",
    min: "분",
    s_20: "초",
    by_itself: "마다 스스로 새 값을 받아 와요",
    refresh_the_page_to: "🔄 새 값을 보려면 화면을 새로 고쳐 주세요",
    home_assistant_sends: " (Home Assistant 는 ",
    when_values_change: "값이 변하면",
    every: "분마다",
    and_right_away_when: ' · 상태가 바뀌면 바로 보내요).</p><p class="hal-note">🔒 받는 주소는 비밀번호와 같아요 — 남에게 보이지 마세요. 사이트가 내 집으로 접속하지 않고, 내 Home Assistant 가 보내는 값만 받아요.',
    view_filament_drawer_inventory: ' · <a href="/inventory?tab=drawer" data-go>🧵 필라멘트 서랍 보기 (재고 관리)</a>',
    home_assistant_takes_three: ' Home Assistant 는 세 걸음이면 돼요</h2><ol><li><b>① HACS 에서 「3DSSync」 설치</b><span>단추 한 번으로 저장소가 들어가요</span></li><li><b>② 사이트 주소 · 연결 코드 붙여 넣기</b><span>복사 단추 두 번</span></li><li><b>③ 「⚡ 알아서 찾아 연결」 → 확인</b><span>내 프린터 · 필라멘트 보관 위치와 이름이 맞는 것을 찾아 줘요</span></li></ol><div class="hal-row center"><button class="hal-btn pri big" data-new>➕ 첫 기기 연결하기</button><button class="hal-btn big" data-guide>❓ 그림으로 보는 연결 방법</button></div></section>',
    company_devices_can_only_2: "🏢 업체 기기는 그 업체 대표 · 관리자만 고칠 수 있어요.",
    matching_sensors: "센서 맞추는 중",
    please_choose_a_sensor: "센서를 골라 주세요",
    not_linked_to_a: "회원과 안 이어짐",
    needs_attention: "확인이 필요해요",
    heads_up_samsung_is: '<p class="hal-note-pay" role="note">💳 <b>미리 알려 드려요</b> — 삼성이 2026년 10월부터 SmartThings 연동(API)을 <b>유료 이용제</b>로 바꾸고 있어요. 그래서 이 연결은 삼성의 정책에 따라 <b>무료 이용이 중지되어 값이 더 들어오지 않게 될 수 있어요</b>. ',
    if_values_stop_the: '값이 멈추면 기기 카드에 「끊김」으로 보이고, 기기 카드와 그동안의 기록은 그대로 남아요. <a href="',
    target_blank_rel_noopener: '" target="_blank" rel="noopener">삼성 SmartThings 의 안내 글</a></p>',
    expand: "펼치기",
    collapse: "접어 숨기기",
    expand_2: "▾ 펼치기",
    collapse_2: "▴ 접기",
    s_21: '<div class="hal-srctabs" role="tablist" aria-label="받는 곳">',
    disconnected_4: '<span class="hal-pill bad">⚠️ 끊김 ',
    connected_5: '<span class="hal-pill on">🟢 연결됨',
    waiting_for_values_3: '<span class="hal-pill wait">⏳ 값을 기다리는 중</span>',
    not_connected: '<span class="hal-pill">연결 안 됨</span>',
    temp_humidity_sensors_printer: "</h2><p>HA 의 「3DSSync」 통합에서 고른 온습도 센서 · 프린터 · 장비 상태가 사이트로 들어와요 (사이트가 HA 에 접속하지 않아요).</p></div>",
    waiting_area_2: "📡 대기 칸",
    waiting_for_values_4: "값을 기다리는 중",
    no_sensors_linked_via: '<p class="hal-hint">아직 HA 로 이은 센서가 없어요 — HACS 에서 「3DSSync」를 설치하고 사이트 주소 · 연결 코드를 붙여 넣으면 돼요.</p>',
    connect_device_how_to: '<div class="hal-row hal-stc-more"><button type="button" class="hal-btn sm" data-new>➕ 기기 연결</button><button type="button" class="hal-btn sm" data-guide>❓ 연결 방법</button></div>',
    to_add_or_remove: '<p class="hal-hint">센서를 더하거나 빼려면 HA › 설정 › 기기 및 서비스 › 3DSSync › <b>구성</b>. 이름이 보관함 · 프린터 · 장비와 거의 같으면 거기에, 아니면 📡 대기 칸으로 들어와요.</p></section>',
    matter_3ds_link_the: "</span><div><h2>Matter <small>3ds 연결</small></h2><p>애플 홈 · 구글 홈 · SmartThings 에 넣어 둔 Matter 온습도 센서를, 집 안의 「3ds Matter 연결」 프로그램이 사이트로 보내요 (Home Assistant 없이 · 사이트가 집에 접속하지 않아요).</p></div>",
    install_on_another_device: '</div><details class="hal-mtmore"><summary>💻 다른 기기에 설치 (윈도우 · 리눅스 · 맥)</summary>',
    no_sensors_linked_via_2: '<p class="hal-hint">아직 Matter 로 이은 센서가 없어요 — 늘 켜 두는 PC 에 아래 한 줄로 중계를 설치하면, 센서마다 기기가 저절로 생겨요.</p>',
    create_manually_how_to: '<div class="hal-row hal-stc-more"><button type="button" class="hal-btn sm" data-new-mt title="Docker 판에 키를 직접 넣을 때">🔑 직접 만들기</button><button type="button" class="hal-btn sm" data-guide-mt>❓ 연결 방법</button><a class="hal-btn sm" href="',
    readme_target_blank_rel: '#readme" target="_blank" rel="noopener">📖 설치 안내</a></div></section>',
    windows_button_type_button_2: '">🪟 윈도우</button><button type="button" role="tab" data-mq-os="sh" class="',
    copy_new_2: '</code><button type="button" class="hal-btn sm pri" data-mq-cp>📋 복사</button><button type="button" class="hal-btn sm" data-rl-any title="이 한 줄(연결 코드)을 바꿔요 — 옛 한 줄은 바로 막혀요">🔑 새로</button></div>',
    open_a_terminal_ssh_2: "<b>터미널</b> 열기 (SSH 도 돼요)",
    s_2_paste_and_press_2: "</li><li><em>2</em>붙여 넣고 Enter</li><li><em>3</em>찾은 센서에서 <b>➕ 받기</b></li></ol>",
    linux_mac_receive_mqtt: "🐧🍎 리눅스 · 맥은 MQTT 만 받아요 — 먼저 위 <b>⚙️ MQTT 브로커 설정</b>을 저장해 주세요 (python3 기본 기능만 · systemd · crontab · 맥은 launchd). ",
    if_you_only_use: "📶 블루투스만 쓰면 이것만으로 끝 — 브로커 설정은 필요 없어요. MQTT 브로커도 쓰면 위 <b>⚙️ MQTT 브로커 설정</b>을 저장하세요. ",
    on_an_always_on_2: "센서 · 브로커 가까이 늘 켜 두는 PC 에 · 켤 때마다 저절로 시작해요. 🔒 한 줄에 내 연결 코드가 들어 있어요 (남에게 보이지 마세요).</p></section>",
    create_a_new_link: "연결 코드를 새로 만들까요?\n\n· 지금 쓰는 한 줄(🧩 Matter · 📨 MQTT · BT 중계 · 🏠 HA 통합)은 바로 막혀요 — 내 PC 의 중계는 새 한 줄로 다시 깔고, HA 통합에는 새 코드를 넣어 주세요.\n· 이미 만든 기기는 계속 값이 들어와요 (기기마다 받는 키는 따로).",
    copy_the_new_line: " 새 한 줄을 복사해 다시 깔아 주세요.",
    relay_off: '<span class="hal-pill bad">⚠️ 중계 꺼짐</span>',
    check_broker: '<span class="hal-pill bad">⚠️ 브로커 확인</span>',
    mqtt_broker_only_if: '<div class="hal-mqb sub"><div><b>📮 MQTT 브로커 <small>있을 때만 · 블루투스만 쓰면 필요 없어요</small></b><small>Zigbee2MQTT · Tasmota · Shelly 의 값이 올라오는 Mosquitto 같은 곳</small></div><button type="button" class="hal-btn sm" data-mq-set>⚙️ MQTT 브로커 설정</button></div>',
    no_broker_address: "브로커 주소 없음",
    password: " · 🔑 비밀번호",
    no_account: "계정 없음",
    topics: " · 토픽 <code>",
    broker_settings: '</code></small></div><button type="button" class="hal-btn sm" data-mq-set>⚙️ 브로커 설정</button></div>',
    relay: "중계",
    bluetooth_beta: ' · 📶 블루투스 <span class="hal-beta" title="실제 블루투스 센서로 아직 시험하지 못했어요 — 안 되면 알려 주세요">🧪 베타</span> ',
    listening: "듣는 중",
    off: "꺼짐",
    none_2: "없음",
    click_to_stop_receiving: " · 누르면 그만 받기 (기기 · 기록은 그대로)",
    click_to_receive: " · 누르면 받기",
    found_sensors: '<h4 class="hal-mqh">🔎 찾은 센서 <small>',
    click_to_receive_waiting: '개 · 누르면 받기 (📡 대기 칸) · ✅ 받는 중</small></h4><div class="hal-mqcs">',
    the_relay_is_searching: "🔎 중계가 찾는 중이에요 — 블루투스 온습도계 · 브로커 토픽이 값을 보내면 여기에 보여요.",
    no_sensors_found_yet: "아직 찾은 센서가 없어요 — 아래 한 줄로 중계를 설치하면 주변 📶 블루투스 온습도계(윈도우)와 MQTT 브로커의 온습도 토픽이 여기에 보여요.",
    mqtt_bt_3ds_relay_2: "</span><div><h2>MQTT · BT <small>3ds 중계 · MQTT 브로커 · 📶 블루투스</small></h2><p>📶 블루투스 온습도계(샤오미 · Govee · SwitchBot · BTHome — 윈도우 PC · 🧪 베타)와 📮 집 안 MQTT 브로커(Zigbee2MQTT · Tasmota · Shelly · ESPHome)의 온습도를 「3ds 중계」가 사이트로 보내요. 브로커가 없어도 블루투스만으로 돼요 (Home Assistant 없이 · 사이트가 집에 접속하지 않아요).</p></div>",
    install_on_another_device_2: '<details class="hal-mtmore"><summary>💻 다른 기기에 설치 (윈도우 · 리눅스 · 맥)</summary>',
    how_to_connect_2: '<div class="hal-row hal-stc-more"><button type="button" class="hal-btn sm" data-guide-mq>❓ 연결 방법</button></div></section>',
    one_line_install: "한 줄 설치",
    windows_linux_mac: "윈도우 · 리눅스 · 맥",
    broker_settings_2: "브로커 설정",
    address_account_topics: "주소 · 계정 · 토픽",
    choose_sensors: "센서 고르기",
    pill_buttons: "알약 단추",
    bluetooth_thermo_hygrometers: "블루투스 온습도계",
    beta_via_windows_relay: "🧪 베타 · 윈도우 중계 PC 로",
    phone_app_relay: "폰으로 중계",   // 1.17.9 📱 3D SUEÑO 앱 중계 모드
    android_no_pc: "안드로이드 앱 · PC 없이",
    trader_tile: "3DS Trader",   // 1.19.6 🏢 3DS Trader Edition
    trader_tile_sub: "업체 PC · 윈도우",
    gt_app: "📱 폰 앱",   // 1.19.7 ❓ 연결 방법 탭
    gt_trader: "🏢 3DS Trader",
    app_guide_top: '<p class="hal-guide-top">📱 집 와이파이에 둔 안드로이드 폰(<b>3D SUEÑO 앱</b>)이 PC 대신 보내요 — MQTT 브로커의 온습도 센서 · 🖨️ 프린터(Bambu · OctoPrint · Klipper)를 같이. 브로커 · 토픽은 <b>MQTT · BT</b> 탭 ⚙️ 브로커 설정 그대로예요.</p>',
    trader_guide_top: '<p class="hal-guide-top">🏢 업체 PC 에 <b>3DS Trader</b>가 켜져 있으면 그 PC 가 보내요 — 대표 · 매니저 계정만 · 연결 프로그램을 따로 깔 필요 없어요. 브로커 · 토픽은 <b>MQTT · BT</b> 탭 ⚙️ 브로커 설정 그대로예요.</p>',
    ha_direct: '<p class="hal-guide-top" data-mtg-top>🏠 Home Assistant 는 <b>3DSSync</b> 통합이 이 사이트로 <b>바로</b> 보내요 — 중계 PC · 폰 앱 · 3DS Trader가 필요 없어요.</p>',
    app_relay_guide: '<section class="hal-sec"><h4>📱 폰으로 중계 <small>3D SUEÑO 안드로이드 앱 · PC 대신</small></h4><div class="hal-mtg-apps"><div><b>① 앱 › 내 프린터 › 📡 중계 모드</b><span>집 와이파이에 둔 폰(충전기에 꽂은 남는 폰이면 좋아요)</span></div><div><b>② 📨 IoT 센서 「같이 중계」 켜기</b><span>연결 코드는 저절로 · 브로커 · 받을 토픽은 이 화면 ⚙️ 브로커 설정 그대로</span></div><div><b>③ ▶ 켜기</b><span>알림이 떠 있는 동안 보내요 · 받는 곳에 「📱 기기 이름 (앱)」 으로 보여요 · 📶 절전 막기에서 배터리 최적화를 빼 주세요</span></div><div><b>💾 백업</b><span>설정은 사이트에 암호화해 저절로 맡겨요 — 폰을 바꾸면 중계 화면을 열 때 불러와요</span></div></div><p class="hal-hint">📶 블루투스 온습도계는 아직 PC 중계만 돼요. 🏠 홈어시스턴트 · 🔷 SmartThings · 🧩 Matter 는 중계가 필요 없거나 따로예요.</p></section>',
    topic_examples: "토픽 예",
    turn_off: "끄기",
    relay_sensors: "중계 · 센서",
    broker_settings_mqtt_card: '<section class="hal-sec"><h4>⚙️ 브로커 설정 <small>MQTT 카드 › ⚙️ 브로커 설정</small></h4><div class="hal-mtg-apps">',
    address_port_ip_of: "<div><b>📮 주소 · 포트</b><span>Mosquitto · HA 의 Mosquitto 애드온이 도는 기기의 IP · 보통 1883 (TLS 는 8883)</span></div>",
    account_same_as_what: "<div><b>👤 계정</b><span>MQTT Explorer 에 넣는 것과 같아요 · 🔒 비밀번호는 암호화해 두고 다시 보이지 않아요</span></div>",
    topics_means_everything_only: "<div><b>🧾 토픽</b><span><code>#</code> 은 전부 — 온습도가 든 것만 골라 보여요</span></div>",
    no_broker_leave_it: "<div><b>📶 브로커가 없으면</b><span>비워 둬도 윈도우 중계는 블루투스만으로 돌아요</span></div></div></section>",
    choose_sensors_2: '<section class="hal-sec"><h4>🔎 센서 고르기</h4><div class="hal-mtg-apps">',
    pill_button_click_to: "<div><b>➕ 알약 단추</b><span>누르면 그 센서가 기기로 — 📡 대기 칸에 생겨요 (이름이 보관함 · 프린터와 거의 같으면 거기에)</span></div>",
    receiving_click_to_stop: "<div><b>✅ 받는 중</b><span>누르면 그만 받아요 · 기기와 기록은 그대로</span></div>",
    mark_a_thermo_hygrometer: "<div><b>📶 표시</b><span>블루투스로 들은 온습도계예요</span></div>",
    delete_device_card_delete: "<div><b>🗑 지우기</b><span>기기 카드 ✏️ › 지우기 — 그 토픽은 그만 받아요</span></div></div></section>",
    bluetooth_thermo_hygrometers_beta: '<section class="hal-sec"><h4>📶 블루투스 온습도계 <span class="hal-beta" title="실제 블루투스 센서로 아직 시험하지 못했어요 — 안 되면 알려 주세요">🧪 베타</span> <small>윈도우 중계 PC 가 주변 센서의 신호를 바로 들어요 · 짝짓기 · 앱 없이</small></h4><div class="hal-mtg-apps">',
    supported_xiaomi_lywsd03mmc_mho: "<div><b>✅ 되는 것</b><span>샤오미 LYWSD03MMC · MHO-C401 (pvvx · ATC 펌웨어) · BTHome · Govee H5072 · H5074 · H5075 · SwitchBot 온습도계 (플러스 · 실외) · Inkbird IBS-TH · 샤오미 옛 둥근 온습도계</span></div>",
    xiaomi_stock_firmware_values: "<div><b>⚠️ 샤오미 기본 펌웨어</b><span>값을 암호로 보내 못 읽어요 — 브라우저에서 <b>pvvx 펌웨어</b>로 바꾸면 돼요 (Telink Flasher · 몇 분)</span></div>",
    requirements_windows_10_11: "<div><b>💻 조건</b><span>블루투스 4.0 이상인 윈도우 10 · 11 PC · 센서와 10m 안쪽 · 브로커는 없어도 돼요</span></div>",
    linux_mac_mqtt_only: "<div><b>🐧🍎 리눅스 · 맥</b><span>아직 MQTT 만 — 블루투스는 ESP32 OpenMQTTGateway · Theengs Gateway 로 브로커에 올리면 그대로 보여요</span></div></div>",
    beta_signal_formats_are: '<p class="hal-hint">🧪 <b>베타</b> — 센서마다 신호 모양을 맞춰 두었지만 실제 센서로는 아직 시험하지 못했어요. 찾은 센서에 안 보이거나 값이 이상하면 기종을 알려 주세요. 설치하거나 다시 켜면 15초 동안 찾은 것을 보여 줘요 · 끄기: <code>link.ps1 -NoBle</code></p></section>',
    topic_examples_broker_settings: '<section class="hal-sec"><h4>🧾 토픽 예 <small>⚙️ 브로커 설정 › 받을 토픽 (한 줄에 하나)</small></h4><div class="hal-mtg-apps">',
    esphome_lt_name_gt: "<div><b>ESPHome</b><code>&lt;이름&gt;/sensor/#</code></div><div><b>Theengs · OpenMQTTGateway</b><code>home/+/BTtoMQTT/#</code></div><div><b>HA statestream</b><code>homeassistant/sensor/#</code></div></div></section>",
    turn_off_only_what: '<section class="hal-sec"><h4>🔌 끄기 <small>필요한 것만</small></h4><div class="hal-mtg-apps">',
    turn_off_the_relay: '<div><b>① 중계 끄기</b><span>그 PC 에서 보내기를 멈추고 지워요 · 사이트 기기는 「끊김」으로 남아요</span><code>🪟 powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\\3dsMqtt\\uninstall.ps1"</code><code>🐧🍎 bash ~/.3ds-mqtt/uninstall.sh</code></div>',
    stop_receiving_one_sensor: "<div><b>② 센서 하나 그만 받기</b><span>MQTT 카드의 ✅ 받는 중 단추를 눌러요</span></div>",
    delete_a_site_device: "<div><b>③ 사이트 기기 지우기</b><span>기기 ✏️ 고치기 › 🗑 지우기</span></div></div></section>",
    sensor_mqtt_broker_bluetooth: '<div class="hal-mtg"><p class="hal-mtg-flow">🌡️ 센서 → MQTT 브로커 · 📶 블루투스 → 💻 중계 PC · 📱 폰 앱 · 🏢 3DS Trader → 이 사이트 <small>HA 없이 · 센서는 원래 앱에 그대로</small></p>',
    hidden_back_to_start: '" hidden><button type="button" class="hal-btn sm hal-mtg-back" data-mtg-back>◀ 처음으로</button>',
    broker_address_ip_or: '<section class="hal-sec"><div class="hal-two"><label>브로커 주소 <small>IP 또는 이름</small><input name="host" value="',
    placeholder_e_g_192_2: '" placeholder="예: 192.168.0.54" autocapitalize="off" autocomplete="off" spellcheck="false"></label>',
    port_usually_1883_tls: '<label>포트 <small>보통 1883 · TLS 8883</small><input name="port" type="number" min="1" max="65535" inputmode="numeric" value="',
    connect_over_tls_mqtts: "> 🔒 TLS 로 붙기 (mqtts)</label></section>",
    account_leave_blank_if: '<section class="hal-sec"><h4>계정 <small>브로커가 익명을 받으면 비워 두기</small></h4><div class="hal-two"><label>사용자 이름<input name="user" value="',
    password_input_name_pass: '<label>비밀번호<input name="pass" type="password" value="" placeholder="',
    unchanged_enter_only_to: "그대로 (바꿀 때만 적기)",
    leave_blank_if_none: "없으면 비워 두기",
    clear_the_saved_password: '<label class="hal-chk"><input type="checkbox" name="clear_pass"> 적어 둔 비밀번호 지우기</label>',
    the_password_is_stored: '<p class="hal-hint">🔒 비밀번호는 사이트에 암호화해 두고, 내 중계만 연결 코드로 받아 가요 (이 화면에 다시 보이지 않아요). 읽기만 하는 계정이면 더 좋아요.</p></section>',
    topics_to_receive_one: '<section class="hal-sec"><h4>받을 토픽 <small>한 줄에 하나 · 10줄까지</small></h4><textarea name="topics" rows="3" autocapitalize="off" spellcheck="false">',
    everything_e_g_zigbee2mqtt: '<p class="hal-hint"><code>#</code> = 모두 · 예: <code>zigbee2mqtt/+</code> · <code>tele/+/SENSOR</code> · <code>shellies/#</code> — 온도 · 습도가 든 것만 「찾은 센서」에 보여요. 📶 블루투스만 쓰면 주소를 비워 둬도 돼요.</p></section>',
    mqtt_broker_settings: " MQTT 브로커 설정",
    stop_receiving_this_topic: "이 토픽을 그만 받을까요? 기기와 그동안의 기록은 남아요.",
    needs_attention_2: '<span class="hal-pill bad">⚠️ 확인 필요</span>',
    choose_sensors_3: '<span class="hal-pill wait">👉 센서 고르기</span>',
    matching: '<span class="hal-pill wait">⏳ 맞추는 중</span>',
    not_connected_2: '<span class="hal-pill">⚪ 연결 안 됨</span>',
    smartthings_values_from_samsung: "</span><div><h2>SmartThings</h2><p>삼성 SmartThings 의 온습도계 · 플러그 · 프린터 기기 · 문 · 움직임 센서 값이 바뀔 때마다 바로 들어와요.</p></div>",
    the_admin_hasn_t: '<p class="hal-hint">관리자가 아직 SmartThings 연결을 준비하지 않았어요.</p></section>',
    s_1_sign_in_with: '<div class="hal-stc-go"><ol class="hal-stc-steps"><li><em>1</em>삼성 계정으로 로그인</li><li><em>2</em>「허용」 누르기</li><li><em>3</em>받을 센서 고르기</li></ol>',
    connect_smartthings_illustrated_guide: '<div class="hal-row"><button type="button" class="hal-btn pri big" data-st-go>🔗 SmartThings 연결하기</button><button type="button" class="hal-btn big" data-st-guide>❓ 그림으로 보기</button></div>',
    the_site_only_reads: '<p class="hal-hint">🔒 사이트는 값을 읽기만 해요 (기기를 켜거나 끄지 않아요). 삼성 계정 비밀번호는 삼성 화면에만 적어요.</p>',
    smartthings_location: "SmartThings 위치",
    sensors_4: " · 센서 ",
    last_value: " · 마지막 값 ",
    reconnect: '<button type="button" class="hal-btn sm" data-revive title="구독을 다시 확인하고 지금 값을 물어봐요">🔄 다시 잇기</button>',
    choose_sensors_button_type: '">⚙️ 센서 고르기</button><button type="button" class="hal-btn sm danger" data-st-del="',
    disconnect: '">연결 끊기</button></div></div>',
    reconnect_2: ' <button type="button" class="hal-btn sm" data-st-go>🔗 다시 연결</button>',
    no_sensors_chosen_yet: "아직 고른 센서가 없어요 — <b>⚙️ 센서 고르기</b>를 눌러 받을 센서를 체크해 주세요.",
    waiting_for_sensor_values: "센서 값을 기다리는 중이에요.",
    connect_another_location: '<button type="button" class="hal-btn sm" data-st-go>➕ 다른 위치 연결</button>',
    how_to_connect_3: '<button type="button" class="hal-btn sm" data-st-guide>❓ 연결 방법</button></div>',
    create_a_new_device: '<option value="">➕ 새 기기 만들기 (「SmartThings」)</option>',
    link_code: '<div class="hal-stc-code"><div><small>연결 코드 · ',
    min_left_single_use: "분 남음 · 한 번만</small><b data-st-code-v>",
    attach_to_2: "</b><small>붙일 기기: ",
    new_device_smartthings: "새 기기 「SmartThings」",
    copy_new_3: '</small></div><div class="hal-row"><button type="button" class="hal-btn pri" data-st-copy>📋 복사</button><button type="button" class="hal-btn" data-st-new>🔄 새로</button></div></div>',
    device_to_pass_values: '<div class="hal-stc-code empty"><label>값을 넘길 기기<select data-st-dev-new>',
    create_link_code: ">🔑 연결 코드 만들기</button></div>",
    aria_label_device_to: '" aria-label="값을 넘길 기기">',
    choose_a_device: '<option value="">— 기기 고르기 —</option>',
    none_yet: "아직 없음",
    disconnect_2: '">연결 끊기</button></div>',
    waiting_for_sensor_values_2: '<p class="hal-hint">센서 값을 기다리는 중이에요. SmartThings 앱에서 센서를 골랐는지 확인해 주세요.</p>',
    create_link_code_if: "<ol><li><b>「🔑 연결 코드 만들기」</b> — 값을 넘길 기기를 먼저 고르면 그 기기로 들어가요.</li>",
    smartthings_app_automations_tab: "<li>SmartThings 앱 → <b>자동화</b> 탭 → <b>＋</b> → <b>루틴 추가</b> → 아래 <b>발견</b>에서 이 사이트의 앱을 눌러요.</li>",
    enter_the_8_characters: "<li><b>연결 코드</b> 칸에 8글자를 적고 <b>다음</b> → 센서를 골라 <b>완료</b> → <b>허용</b>.</li></ol>",
    the_link_code_can: '<p class="hal-hint">연결 코드는 ',
    minutes_to_change_sensors: "분 안에 한 번만 쓸 수 있어요. 센서를 바꾸려면 SmartThings 앱에서 그 앱을 열어 고쳐요.</p>",
    legacy_method_link_with: "><summary>🔑 예전 방식 — 연결 코드로 잇기 (SmartThings 앱의 SmartApp)</summary>",
    going_to_smartthings: "SmartThings 로 가는 중…",
    reconnecting: "다시 잇는 중…",
    disconnect_smartthings_device_cards: "SmartThings 연결을 끊을까요? 기기 카드와 기록은 남아요.",
    choose_smartthings_sensors: "⚙️ SmartThings 센서 고르기",
    loading_devices_from_smartthings: '<div class="hal-empty sm">SmartThings 에서 기기를 불러오는 중…</div>',
    selected: "개 고름",
    none_selected: "고른 것 없음",
    up_to: "개 — ",
    can_be_selected: "개까지 고를 수 있어요",
    no_receivable_sensors_temperature: '<div class="hal-empty sm">이 위치에는 받을 수 있는 센서(온도 · 습도 · 플러그 · 문 · 움직임 …)가 없어요.<br>SmartThings 앱에 센서를 먼저 등록해 주세요.</div>',
    as_a_new_device: '<option value="">➕ 새 기기 카드로</option>',
    s_22: '<optgroup label="🖨️ 내 프린터에 붙이기 (프린터 라운지에 보여요)">',
    s_23: '<optgroup label="이미 있는 기기 카드">',
    from_the_printer_lounge: '<p class="hal-to to-printer hal-pk-want"><i aria-hidden="true">🖨️</i><span><small>프린터 라운지에서 왔어요</small><b>「',
    check_the_plugs_thermo: "」에 붙일 플러그 · 온습도계를 체크해 주세요</b></span></p>",
    sensors_check_the_ones: "</b> 의 센서예요. 받을 것을 체크하고 <b>저장</b>하면 값이 바뀔 때마다 바로 들어와요. 센서 하나가 기기 카드 하나가 돼요.</p>",
    all_thermo_hygrometers_clear: '<div class="hal-pk-tools"><b data-pk-count></b><span><button type="button" class="hal-chip" data-pk-env>🌡️ 온습도계 모두</button><button type="button" class="hal-chip" data-pk-none>모두 해제</button></span></div>',
    printer_device: ' <em class="hal-pk-tag">프린터 기기</em>',
    receiving_the_legacy_way: "⚠️ 예전 방식(온습도계 · 플러그처럼)으로 받고 있어요 — 붙일 곳을 <b>내 프린터</b>로 두고 <b>저장</b>을 한 번 눌러 주세요. ",
    attach_it_to_my: "🖨️ 내 프린터에 붙이면 출력 상태 · 진행률 · 노즐/베드 온도가 프린터 라운지 카드로 가요.</small>",
    attach_to_select_data: '<label class="hal-pk-to">붙일 곳<select data-pk-to="',
    running_when_the_plug: '<section class="hal-sec"><label>🔌 플러그가 이 전력(W)보다 많이 쓰면 「가동 중」 <small>프린터 · 건조기의 대기 전력보다 조금 높게 — 가동 시간(정비 수첩)을 세요</small><input type="number" min="0.5" max="5000" step="0.5" inputmode="decimal" data-pk-w value="',
    to_show_it_in: '<p class="hal-hint">🖨️ <b>프린터 라운지에 보이게 하려면</b> 「붙일 곳」을 <b>내 프린터</b>로 골라 주세요 — 플러그는 전력으로 <b>출력 중 · 쉬는 중</b>이, 온습도계는 프린터 카드에 <b>주변 온도 · 습도</b>가 보여요 (진행률 · 남은 시간 · 카메라는 SmartThings 로는 알 수 없어요).</p>',
    the_site_only_reads_2: '<p class="hal-hint">🔒 사이트는 값을 읽기만 해요. 체크를 풀어도 이미 만든 기기 카드와 기록은 남아요 (카드의 ✏️ 에서 지울 수 있어요). 카드의 ✏️ 에서 알림 기준 · 필라멘트 보관함 · 내 프린터에 붙일 수 있어요.',
    you_can_create: " 새 기기 카드는 ",
    more_new_device_cards: "개 더 만들 수 있어요.",
    copied: "✔ 복사했어요",
    couldn_t_copy_please: "복사하지 못했어요 — 글을 직접 골라 복사해 주세요.",
    back_to_start: '<div class="hal-row hal-mtg-nav"><button type="button" class="hal-btn sm hal-mtg-back" data-mtg-back>◀ 처음으로</button>',
    next: '">다음 ',
    back_to_start_2: '<button type="button" class="hal-btn sm hal-mtg-back" data-mtg-back>◀ 처음으로</button>',
    add_the_repository_to: "HACS 에 저장소 넣기 <small>처음 한 번만</small>",
    in_hacs_top_right: "HACS 오른쪽 위 <b>⋮</b> → <b>사용자 지정 저장소</b> → 주소를 붙여 넣고 종류는 <b>통합</b> → <b>추가</b>. 연결 창의 <b>🧩 내 Home Assistant 의 HACS 에서 열기</b>를 누르면 이 걸음은 건너뛰어요.",
    custom_repositories: '<div class="hal-fake-opt">사용자 지정 저장소</div>',
    repository: "저장소",
    type: "종류",
    integration: "통합",
    add: "추가",
    download_and_restart: "내려받고 다시 시작",
    open_3ds_click_download: "<b>3DSSync</b> 를 열어 <b>다운로드</b>를 누르고, Home Assistant 를 <b>다시 시작</b>해 주세요 (설정 › 시스템 › 다시 시작). 다시 시작해야 통합 목록에 나와요.",
    integration_sends_temp_humidity: ' · 통합</small></div></div><p class="hal-fake-p">온습도 센서 · 프린터 상태 · 카메라 사진을 사이트로 보냅니다.</p><div class="hal-fake-end">',
    download: "⬇ 다운로드",
    settings_system: '</div><div class="hal-fake-note">설정 › 시스템 › ',
    restart: "<u>다시 시작</u>",
    find_3ds_in_add: "통합 추가에서 「3DSSync」 찾기",
    settings_devices_services_bottom: "설정 › 기기 및 서비스 → 오른쪽 아래 <b>통합 추가</b> → <b>3DSSync</b> 를 찾아 누르세요. 연결 창의 <b>⚙️ 「3DSSync」 통합 추가 열기</b>를 눌러도 돼요.",
    home_assistant_devices_services: "Home Assistant · 기기 및 서비스",
    integrations: '<b class="hal-fake-t">통합</b>',
    s_3ds_3ds_temp_humidity: '<div class="hal-fake-repo"><span class="hal-fake-logo">3DS</span><div><b>3DSSync</b><small>온습도 · 프린터 · 장비 상태를 사이트로</small></div></div>',
    add_integration: "＋ 통합 추가",
    paste_the_site_url: "사이트 주소 · 연결 코드 붙여 넣기",
    click_connect_device_on: "이 화면의 <b>➕ 기기 연결</b>을 누르면 두 가지가 나와요. <b>📋 복사</b>해서 Home Assistant 에 붙여 넣고 <b>확인</b>. 연결 코드는 비밀번호와 같아요.",
    site_home_assistant: "사이트 → Home Assistant",
    site_url: "사이트 주소",
    copy: "📋 복사",
    link_code_2: "연결 코드",
    ok: "확인",
    auto_detect_and_connect: "「⚡ 알아서 찾아 연결」 → 확인",
    choose_auto_detect_and: "맨 위 <b>⚡ 알아서 찾아 연결</b>을 고르면, 사이트의 내 프린터 · 필라멘트 보관 위치와 <b>이름이 맞는 것</b>이 체크되어 나와요. 맞는지 보고 <b>확인</b>. 같은 기기의 온도 센서는 알아서 같이 붙어요.",
    what_to_attach_to: '<b class="hal-fake-t">무엇에 붙일까요?</b>',
    auto_detect_and_connect_2: '<div class="hal-fake-opt on">◉ ⚡ 알아서 찾아 연결 (추천)</div>',
    my_printer_one_by: '<div class="hal-fake-opt">○ 내 프린터 — 하나씩</div><hr><b class="hal-fake-t">연결할 것</b>',
    living_room_bambu_lab: "🖨️ 거실 · Bambu Lab P1S ← P1S",
    dry_box_dry_box: "🧵 드라이박스 ← 드라이박스 습도",
    living_room_humidity_new: "🧵 거실 습도 (새 보관함)",
    attach_printers_equipment_that: "못 찾은 프린터 · 장비 붙이기 <small>필요할 때만</small>",
    if_names_differ_and: "이름이 달라 못 찾았으면 통합을 한 번 더 추가해 <b>내 프린터 — 하나씩</b> · <b>업체 장비 — 하나씩</b>을 고르세요. Home Assistant 의 <b>기기를 고르면</b> 상태 · 진행률 · 카메라 센서를 찾아 채워 줘요.",
    home_assistant_3ds_one: "Home Assistant · 3DSSync — 하나씩",
    device_optional: "기기 (안 골라도 됨)",
    choose_sensors_found_ones: '<hr><b class="hal-fake-t">센서 고르기 <small>찾은 것이 채워져 있어요</small></b>',
    progress: "진행률 (%)",
    camera: "카메라",
    finish_on_the_site: "사이트에서 마무리",
    it_appears_on_this: "1~2분 안에 이 화면에 🟢 로 나타나요. 카드의 <b>✏️</b>에서 <b>알림 기준</b> · 이름 · 붙일 곳 · <b>사진 공개</b>를 정하고, 재고 관리에서 필라멘트의 <b>보관 위치</b>를 목록에서 고르면 습도가 필라멘트에 같이 보여요.",
    site_iot_link_inventory: "사이트 · IoT 연결 · 재고 관리",
    dry_box: '<div class="hal-fake-card"><div class="hal-fake-row"><span>🧵 <b>드라이박스</b></span>',
    just_now_2: '<div class="hal-fake-st"><i></i>방금</div>',
    storage_location_where_the: '<div class="hal-fake-fld"><small>보관 위치 <em>🏠 온습도 센서가 있는 곳</em></small><span>드라이박스 ▾</span></div>',
    dry_in_12_days: '<div class="hal-fake-tags"><span>💧 건조 12일 뒤</span><span class="ha">🏠 💧32.5% 🌡️23.4°C</span></div>',
    good_to_know: '<section class="hal-sec hal-tips"><h4>💡 더 알아 두면 좋아요</h4><ul>',
    for_printers_company_equipment: "<li><b>프린터 · 업체 장비</b>는 통합을 한 번 더 추가해 「내 프린터 — 하나씩」 · 「업체 장비 — 하나씩」을 고르세요. Home Assistant 의 기기를 고르면 상태 · 진행률 · 카메라 센서를 찾아 채워 줘요.</li>",
    to_add_or_remove_2: "<li><b>센서를 더 붙이거나 빼려면</b> Home Assistant 의 그 통합에서 <b>구성</b>을 누르세요.</li>",
    to_move_an_attached: "<li><b>이미 붙인 센서를 다른 곳으로</b> 옮기려면 이 화면의 카드 ✏️ → 「무엇에 붙일까요?」를 바꾸면 돼요.</li>",
    if_it_doesn_t: "<li><b>🟢 로 안 바뀌면</b> Home Assistant 를 다시 시작했는지, 사이트 주소가 <code>https://</code> 로 시작하는지 확인하세요. 그래도 안 되면 설정 › 시스템 › 로그에서 <code>g7_link</code> 를 찾아보세요.</li>",
    if_you_don_t: "<li>HACS 를 안 쓰면 연결 창의 <b>📝 HACS 없이 설정 글로</b>를 누르세요.</li></ul>",
    illustrations_are_mock_ups: '<p class="hal-hint">그림은 화면을 본떠 그린 거예요. Home Assistant 화면은 버전에 따라 조금 다를 수 있어요.</p></section>',
    it_takes_about_5: '<p class="hal-guide-top" data-mtg-top>처음이라면 <b>5분</b>이면 돼요. Home Assistant 에서 할 일(①~⑥)과 사이트에서 할 일(⑦)을 순서대로 보여 드려요. 빨간 테두리 <span class="hal-hl sm">이렇게</span> 표시한 곳을 순서대로 누르면 돼요. 아래 번호를 누르면 그 걸음만 보여요.</p>',
    good_to_know_2: "더 알아 두기",
    site: "사이트",
    smartthings_thermo_hygrometers_plugs: '</span><span><b>SmartThings</b><small>온습도계 · 플러그 · 문 · 움직임 센서</small></span></span><span class="hal-fake-pill">⚪ 연결 안 됨</span></div>',
    click_connect_smartthings: "「🔗 SmartThings 연결하기」 누르기",
    it_s_the_button: "이 화면 위쪽 <b>SmartThings 카드</b>의 단추예요. 누르면 삼성 SmartThings 의 로그인 화면으로 넘어가요.",
    site_iot_link: "사이트 · IoT 연결",
    connect_smartthings: "🔗 SmartThings 연결하기",
    sign_in_with_your: "삼성 계정으로 로그인",
    sign_in_with_the: "SmartThings 앱에서 쓰는 <b>삼성 계정</b>으로 로그인해요. 비밀번호는 삼성 화면에만 적어요 — 사이트는 볼 수 없어요. 이미 로그인되어 있으면 이 걸음은 건너뛰어요.",
    samsung_account_sign_in: "삼성 계정 · 로그인",
    email_or_phone_number: "이메일 또는 전화번호",
    password_2: "비밀번호",
    sign_in: "로그인",
    choose_a_location_and: "위치를 고르고 「허용」",
    choose_the_location_with: "센서가 있는 <b>위치</b>(예: 우리집)를 고르고 <b>허용</b>(Authorize)을 눌러요. 사이트가 받는 권한은 <b>기기 · 위치 보기</b>(읽기)뿐이라 기기를 켜거나 끌 수 없어요.",
    smartthings_allow_permissions: "SmartThings · 권한 허용",
    is_requesting: "」 이(가) 요청하는 권한</b>",
    view_devices_read_values: "기기 보기 <small>(값 읽기)</small>",
    view_locations_name_temperature: "위치 보기 <small>(이름 · 온도 단위)</small>",
    location: "위치",
    my_home: "우리집 ▾",
    cancel: "취소",
    allow: "허용",
    choose_sensors_to_receive: "받을 센서 고르기",
    back_on_the_site: "사이트로 돌아오면 그 위치의 센서 목록이 떠요. 받을 것을 체크하고 <b>저장</b>. <b>온습도계는 미리 체크</b>되어 있어요. 이름이 같은 기기 카드가 있으면 거기에 붙고, 없으면 새 카드가 생겨요.",
    site_choose_sensors: "사이트 · ⚙️ 센서 고르기",
    dry_box_thermo_hygrometer: "🌡️ <b>드라이박스 온습도계</b> <small>온도 23.4°C · 습도 32%</small>",
    dryer_plug_power_120: "🔌 <b>건조기 플러그</b> <small>전력 120 W</small>",
    front_door_open_closed: "🚪 현관문 <small>열림 닫힘</small>",
    done_set_alert_thresholds: "끝 — 카드에서 알림 기준 · 붙일 곳 정하기",
    values_appear_on_the: "바로 기기 카드에 값이 보이고, 값이 바뀔 때마다 들어와요. 카드의 <b>✏️</b>에서 <b>알림 기준</b>(예: 습도 40%)과 <b>붙일 곳</b>(필라멘트 보관함 · 내 프린터)을 정하면 재고 관리 · 정비 수첩 · 내 프린터와 이어져요.",
    dry_box_thermo_hygrometer_2: '<div class="hal-fake-card"><div class="hal-fake-row"><span>🧵 <b>드라이박스 온습도계</b> <span class="hal-fake-pill st">',
    humidity_above: "습도가 이보다 높으면 (%)",
    what_to_attach_to_2: "무엇에 붙일까요?",
    filament_resin_storage_box: "🧵 필라멘트 · 레진 보관함 — 드라이박스",
    what_works_for_printers: '<section class="hal-sec hal-sup"><h4>🖨️ 프린터에 쓸 수 있는 것 <small>SmartThings 의 무엇을 「🖨️ 내 프린터」에 붙이면 프린터 라운지에 무엇이 보이나</small></h4>',
    bambu_lab_edge_driver: '<div class="hal-sup-w"><table><thead><tr><th></th><th>🖨️ Bambu Lab<small>Edge 드라이버 (LAN)</small></th><th>🖨️ Klipper<small>Edge 드라이버 (Moonraker)</small></th><th>🔌 전력 플러그</th><th>🌡️ 온습도계</th></tr></thead><tbody>',
    print_start_end_logged: "출력 시작 · 끝 저절로 기록",
    by_power: "<small>전력으로</small>",
    time_left: "남은 시간",
    estimate: '<i class="y">≈</i><small>어림</small>',
    print_name: "출력물 이름",
    paused_failed_distinction: "일시정지 · 실패 구분",
    nozzle_bed_temperature: "노즐 · 베드 온도",
    ams_humidity_light: "AMS 습도 · 조명",
    part_fan: "부품 팬",
    ambient_temperature_humidity: "주변 온도 · 습도",
    camera_timelapse: "📷 카메라 · 타임랩스",
    status_reported_by_bambu: '<ul class="hal-sup-st"><li><b>Bambu Lab</b> 이 알려 주는 상태 — <span>출력 중</span> <span>쉬는 중</span>. 끝날 때 진행률이 98% 를 넘었으면 <span class="ok">완료</span>, 아니면 <span class="no">그만둠</span>으로 기록해요.</li>',
    status_reported_by_klipper: '<li><b>Klipper</b> 가 알려 주는 상태 — <span>standby 쉬는 중</span> <span>printing 출력 중</span> <span>paused 일시정지</span> <span class="ok">complete 완료</span> <span class="no">cancelled · error 실패</span></li>',
    power_plug_above_the: '<li><b>전력 플러그</b> — 정한 W 보다 많이 쓰면 <span>출력 중</span>, 내려가면 <span class="ok">완료</span>.</li></ul>',
    printer_devices_are_3d: '<p class="hal-hint">프린터 기기는 SmartThings 허브에 <b>커뮤니티 Edge 드라이버</b>를 깔아 등록한 3D 프린터예요 (삼성 공식 기기 종류는 아니에요). 드라이버 · 버전에 따라 보이는 값이 다를 수 있고, ⚙️ 센서 고르기에 <b>🖨️ 프린터 기기</b>로 나오면 받을 수 있어요. 📷 카메라 · 타임랩스는 SmartThings 로 받을 수 없어요 — 프린터 라운지의 <b>한 줄 연결</b>이나 Home Assistant 로 (같은 프린터에 같이 써도 돼요).</p></section>',
    received_states_what_printers: '<section class="hal-sec hal-sup"><h4>📋 받는 상태 <small>프린터 · 플러그가 알려 주는 말</small></h4>',
    to_add_or_remove_3: "<li><b>센서를 더하거나 빼려면</b> SmartThings 카드의 <b>⚙️ 센서 고르기</b>에서 체크를 바꾸고 저장하세요. 다시 로그인할 필요는 없어요.</li>",
    to_receive_sensors_from: "<li><b>다른 집 · 사무실(위치)</b>의 센서도 받으려면 <b>➕ 다른 위치 연결</b>을 누르고 삼성 화면에서 그 위치를 고르세요.</li>",
    power_metering_plugs_count: "<li><b>전력을 재는 플러그</b>는 정한 W(기본 10W)보다 많이 쓰는 동안을 「가동 중」으로 봐요 — 프린터 · 건조기의 가동 시간이 정비 수첩에 쌓여요. 전력을 못 재는 플러그는 켜짐 = 가동 중.</li>",
    to_show_it_in_2: "<li><b>프린터 라운지에 보이게 하려면</b> ⚙️ 센서 고르기의 「붙일 곳」를 <b>🖨️ 내 프린터</b>로 고르세요. 프린터에 꽂은 <b>전력 플러그</b>는 출력 중 · 쉬는 중과 출력 기록을, <b>온습도계</b>는 프린터 카드의 주변 온도 · 습도를 보여 줘요.</li>",
    to_use_it_for: "<li><b>필라멘트 보관함 습도</b>로 쓰려면 카드 ✏️ → 「필라멘트 · 레진 보관함」을 고르고 보관 위치를 필라멘트에 적은 것과 같게 적으세요. SmartThings 의 센서 이름이 보관 위치와 같으면 알아서 붙어요.</li>",
    if_the_card_shows: "<li><b>카드에 ⚠️ 가 보이면</b> 안내 글 옆의 <b>🔗 다시 연결</b>을 눌러 한 번 더 로그인하세요. 고른 센서는 그대로 있어요.</li>",
    to_stop_using_it: "<li><b>그만 쓰려면</b> <b>연결 끊기</b> — 기기 카드와 기록은 남아요. SmartThings 앱의 「연결된 서비스」에서 지워도 끊겨요.</li></ul>",
    illustrations_are_mock_ups_2: '<p class="hal-hint">그림은 화면을 본떠 그린 거예요. 삼성 계정 · SmartThings 화면은 조금 다를 수 있어요.</p></section>',
    no_app_to_install: '<p class="hal-guide-top" data-mtg-top>앱을 깔거나 코드를 적을 필요 없이 <b>1분</b>이면 돼요. 삼성 화면에서 할 일(②③)과 사이트에서 할 일(①④⑤)을 순서대로 보여 드려요. 빨간 테두리 <span class="hal-hl sm">이렇게</span> 표시한 곳을 순서대로 누르면 돼요. 아래 번호를 누르면 그 걸음만 보여요.</p><div data-mtg-top>',
    what_works_for_printers_2: "프린터에 쓸 수 있는 것",
    support_table: "지원 표",
    received_states: "받는 상태",
    bambu_klipper_plug: "Bambu · Klipper · 플러그",
    windows_linux_mac_raspberry: "윈도우 · 리눅스 · 맥 · 라즈베리파이",
    with_a_matter_server: "Matter 서버도 같이",
    docker_raspberry_pi_nas: "Docker (라즈베리파이 · NAS)",
    add_sensors: "센서 넣기",
    pairing_code: "공유 코드",
    site_devices: "사이트 기기",
    waiting_area_attach: "대기 칸 → 붙이기",
    thread_sensors: "Thread 센서",
    border_router: "경계 라우터",
    disconnect_3: "연결 끊기",
    turn_off_remove_sensors: "끄기 · 센서 빼기",
    homes_without_a_matter: '<section class="hal-sec"><h4>🐳 Matter 서버가 없는 집 <small>Docker — 라즈베리파이 · 리눅스 · NAS</small></h4><ol class="hal-mtg-ol">',
    download_as_in_the: "<li>설치 안내대로 받고 <code>config/config.yaml</code> 을 만들어요 (<code>matter:</code> 줄은 지우기)</li><li><code>docker compose --profile server up -d</code> — 공식 Matter 서버와 중계를 같이 켜요</li>",
    below_create_a_device: "<li>아래 <b>🔑 키를 직접 넣을 기기 만들기</b> → 받는 키를 <code>devices:</code> 에 (사이트 <code>",
    if_you_already_have: "</code>)</li><li>Matter 서버가 이미 있으면 Docker 대신 💻 한 줄 설치가 쉬워요</li></ol>",
    readme_target_blank_rel_2: '#readme" target="_blank" rel="noopener">📖 설치 안내 열기</a></div></section>',
    add_sensors_enter_the: '<section class="hal-sec"><h4>📲 센서 넣기 <small>코드는 직접 적어요 · 몇 분 뒤 만료</small></h4><div class="hal-mtg-apps">',
    apple_home_sensor_turn: "<div><b>🍎 애플 홈</b><span>센서 › ⚙️ › 페어링 모드 켜기</span></div><div><b>🟢 구글 홈</b><span>기기 › ⚙️ › 연결된 Matter 앱 및 서비스</span></div><div><b>🔷 SmartThings</b><span>기기 › ⋮ › 다른 서비스와 공유</span></div></div>",
    asked_during_install_or: '<p class="hal-hint">설치 때 묻거나 — 🪟 <code>powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\\3dsMatter\\link.ps1" -Pair</code> · 🐧🍎 <code>python3 ~/.3ds-matter/link.py --pair</code> · 🐳 <code>docker compose run --rm -it link pair</code></p></section>',
    site_devices_one_line: '<section class="hal-sec"><h4>📦 사이트 기기</h4><div class="hal-mtg-apps"><div><b>💻 한 줄 설치</b><span>센서마다 기기를 저절로 만들어 📡 대기 칸에 — 끌어서 보관함 · 프린터에 붙여요</span></div>',
    docker_version_create_a: "<div><b>🐳 Docker 판</b><span>🔑 키를 직접 넣을 기기 만들기 → 받는 키를 설정에</span></div><div><b>🗑 지우면</b><span>사이트에서 지운 기기는 다시 만들지 않아요</span></div></div></section>",
    thread_sensors_border_router: '<section class="hal-sec"><h4>📶 Thread 센서</h4><div class="hal-mtg-apps"><div><b>경계 라우터</b><span>홈팟 미니 · Apple TV · Nest 허브 같은 것이 집에 있어야 해요</span></div>',
    matter_server_side_on: "<div><b>Matter 서버 쪽</b><span>리눅스면 IPv6 경로를 받도록 한 번 설정 (설치 안내 「Thread 센서」)</span></div><div><b>Wi-Fi 센서</b><span>할 일이 없어요</span></div></div></section>",
    disconnect_only_what_you: '<section class="hal-sec"><h4>🔌 연결 끊기 <small>필요한 것만 — 셋은 따로예요</small></h4><div class="hal-mtg-apps">',
    turn_off_the_relay_2: '<div><b>① 중계 끄기</b><span>그 기기에서 보내기를 멈추고 지워요 · 사이트 기기는 「끊김」으로 남아요</span><code>🪟 powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\\3dsMatter\\uninstall.ps1"</code><code>🐧🍎 bash ~/.3ds-matter/uninstall.sh</code><code>🐳 docker compose down</code></div>',
    remove_one_sensor_removes: "<div><b>② 센서 하나 빼기</b><span>Matter 서버에서 빼고, 사이트 기기도 지울지 물어봐요 (애플 홈 · 구글 홈에는 그대로)</span><code>🪟 … \\3dsMatter\\link.ps1 -Remove</code><code>🐧🍎 python3 ~/.3ds-matter/link.py --remove</code><code>🐳 docker compose run --rm link remove &lt;노드&gt;</code></div>",
    delete_only_the_site: "<div><b>③ 사이트 기기만 지우기</b><span>기기 ✏️ 고치기 › 🗑 지우기 — 중계는 그 센서를 다시 만들지 않아요</span></div></div></section>",
    sensor_matter_server_relay: '<div class="hal-mtg"><p class="hal-mtg-flow">🌡️ 센서 → Matter 서버 → 중계 → 이 사이트 <small>HA 없이 · 센서는 원래 앱에 그대로</small></p>',
    how_to_connect_4: "❓ 연결 방법",
    create_a_device_to: "🔑 키를 직접 넣을 기기 만들기",
    broker_settings_3: "⚙️ 브로커 설정",
    connect_now: "➕ 지금 연결하기",
    what_can_be_attached: '<section class="hal-sec"><h4>무엇을 붙일 수 있나요</h4><ul class="hal-ct-what">',
    thermo_hygrometers_filament_storage: "<li><i>🌡️</i><span><b>온습도계</b> — 필라멘트 보관함의 습도 · 내 프린터 둘레의 온습도</span></li>",
    power_metering_plugs_printer: "<li><i>🔌</i><span><b>전력을 재는 플러그</b> — 프린터 · 건조기의 가동 시간, 내 프린터의 출력 중 · 완료</span></li>",
    printer_devices_edge_driver: "<li><i>🖨️</i><span><b>프린터 기기</b> (Edge 드라이버 — Bambu Lab · Klipper) — 출력 상태 · 진행률 · 노즐/베드 온도</span></li>",
    door_motion_brightness_battery: "<li><i>🚪</i><span><b>문 · 움직임 · 밝기 · 배터리 …</b> — 기기 카드에 값으로</span></li></ul>",
    in_choose_sensors_pick: '<p class="hal-hint">센서 고르기의 <b>「붙일 곳」</b>에서 필라멘트 보관함 카드나 <b>🖨️ 내 프린터</b>를 골라요. <a href="#" data-guide-st>프린터에 쓸 수 있는 것 표 보기 →</a></p></section>',
    s_1_connect_with_your: '<section class="hal-sec"><h4><em>1</em> 삼성 계정으로 연결 <small>앱을 깔거나 코드를 적지 않아요</small></h4>',
    s_1_sign_in_with_2: '<ol class="hal-stc-steps"><li><em>1</em>삼성 계정으로 로그인</li><li><em>2</em>「허용」 누르기</li><li><em>3</em>받을 센서 고르기</li></ol>',
    connect_smartthings_2: '<div class="hal-row"><button type="button" class="hal-btn pri big" data-st-go>🔗 SmartThings 연결하기</button></div>',
    the_admin_hasn_t_2: '<p class="hal-warn">관리자가 아직 SmartThings 연결을 준비하지 않았어요.</p>',
    the_site_only_reads_3: '<p class="hal-hint">🔒 사이트는 값을 읽기만 해요 (기기를 켜거나 끄지 않아요). 삼성 계정 비밀번호는 삼성 화면에만 적어요.</p></section>',
    s_1_choose_sensors_to: '<section class="hal-sec"><h4><em>1</em> 받을 센서 고르기 <small>이미 삼성 계정과 이어져 있어요</small></h4><div class="hal-ct-locs">',
    receiving: "</b><small>센서 ",
    sensors_5: "개 받는 중",
    needs_attention_3: " · ⚠️ 확인 필요",
    choose_sensors_4: '">⚙️ 센서 고르기</button></div>',
    for_newly_bought_sensors: '<p class="hal-hint">새로 산 센서도 SmartThings 앱에 등록한 뒤 여기서 체크하면 돼요 — 다시 로그인할 필요 없어요.</p>',
    connect_another_location_home: '<div class="hal-row"><button type="button" class="hal-btn sm" data-st-go>➕ 다른 위치(집 · 사무실) 연결</button></div>',
    copy_2: '">📋 복사</button></div>',
    connect_device_2: "➕ 기기 연결",
    s_1_install_3ds_from: '<div data-cpn="ha"><section class="hal-sec"><h4><em>1</em> HACS 에서 「3DSSync」 설치 <small>처음 한 번만</small></h4>',
    category_integration_open_in: '&category=integration">🧩 내 Home Assistant 의 HACS 에서 열기</a></div>',
    on_the_screen_that: '<p class="hal-hint">열린 화면에서 <b>다운로드</b>를 누르고 Home Assistant 를 다시 시작해 주세요. 단추가 안 되면 HACS › 사용자 지정 저장소에 <code>https://github.com/',
    type_integration_under_hacs: "</code> (종류: 통합)을 넣으면 돼요.</p></section>",
    s_2_add_the_integration: '<section class="hal-sec"><h4><em>2</em> 통합을 추가하고 아래 두 가지를 붙여 넣기</h4>',
    config_flow_start_domain: 'config_flow_start/?domain=g7_link">⚙️ 「3DSSync」 통합 추가 열기</a></div>',
    the_link_code_is: '<p class="hal-hint">🔒 연결 코드는 비밀번호와 같아요. 새어 나갔으면 아래 「코드 새로 만들기」.</p></section>',
    s_3_auto_detect_and: '<section class="hal-sec"><h4><em>3</em> 「⚡ 알아서 찾아 연결」 → 확인</h4><p class="hal-hint">사이트의 <b>내 프린터</b> · 필라멘트 <b>보관 위치</b>와 이름이 맞는 Home Assistant 기기 · 습도 센서를 찾아 체크해 둬요. 맞으면 <b>확인</b>만 누르면 끝 — 프린터는 상태 · 진행률 · 카메라, 보관함은 습도 · 온도가 한 번에 붙어요. 이름이 달라 못 찾은 것은 같은 목록에서 직접 체크하거나 「하나씩」으로 붙이면 돼요. 조금 뒤 이 화면에 🟢 로 나타나요.</p></section></div>',
    create_a_device_to_2: '<div class="hal-row"><button type="button" class="hal-btn sm" data-ct-mt>🔑 키를 직접 넣을 기기 만들기 (Docker 판)</button></div></div>',
    illustrated_guide_create_new: '<button type="button" class="hal-btn" data-guide2>❓ 그림으로 보기</button><span data-ha-only><button type="button" class="hal-btn" data-rl>🔑 코드 새로 만들기</button><button type="button" class="hal-btn" data-manual>📝 HACS 없이 설정 글로</button></span>',
    create_a_new_link_2: "연결 코드를 새로 만들까요? Home Assistant 의 통합에서 기기를 더 붙이거나 고치려면 새 코드를 넣어야 해요. (이미 붙인 기기는 계속 값이 들어와요)",
    s_24: '</h3><button type="button" class="hal-icobtn" data-x aria-label="닫기">✕</button></header>',
    close: '</div><div><button type="button" class="hal-btn" data-x>닫기</button>',
    s_1_what_to_attach: '<section class="hal-sec"><h4><em>1</em> 무엇에 붙일까요?</h4><div class="hal-pick">',
    storage_location_same_as: '<div data-for="location"><label>보관 위치 <small>필라멘트에 적은 「보관 위치」와 같게</small><input name="location" list="hal-locs" maxlength="40" value="',
    placeholder_e_g_dry: '" placeholder="예: 드라이박스 · AMS · 서랍 2칸"><datalist id="hal-locs">',
    pick_from_storage_boxes: '<div class="hal-locs"><small>📦 보관함에서 고르기</small>',
    my_printer: '<div data-for="printer"><label>내 프린터<select name="printer_id">',
    company_equipment_3: '<div data-for="equipment"><label>업체 장비<select name="equipment_id">',
    name_blank_what_you: '<label>이름 <small>비우면 위에서 고른 것</small><input name="name" maxlength="60" value="',
    placeholder_e_g_living: '" placeholder="예: 거실 드라이박스"></label>',
    category_where_it_s: '<label>📁 분류 <small>화면에서 묶어 보여 줄 곳 — 자동이면 붙인 곳 따라</small><select name="grp">',
    smartthings_sensor_this_device: ' SmartThings 센서</h4><p class="hal-hint">이 기기의 값은 SmartThings 에서 들어와요. 받을 센서는 화면 위쪽 SmartThings 카드의 <b>⚙️ 센서 고르기</b>에서 바꿔요.</p></section>',
    matter_sensor_this_device: ' Matter 센서</h4><p class="hal-hint">이 기기의 값은 <b>3ds Matter 연결</b> 프로그램에서 들어와요 (Home Assistant 센서 이름은 없어도 돼요). ',
    put_the_receive_key: "저장하면 나오는 <b>받는 키</b>를 그 설정에 넣어요.",
    view_receive_key_config: '<a href="#" data-mt-key>🔑 받는 키 · 설정 보기</a>',
    mqtt_topic_this_device: ' MQTT 토픽</h4><p class="hal-hint">이 기기의 값은 <b>3ds MQTT 중계</b>에서 들어와요. 받을 토픽은 받는 곳 › MQTT 카드의 <b>🔎 찾은 센서</b>에서 바꿔요.</p></section>',
    s_2_home_assistant_sensor: '<section class="hal-sec"><h4><em>2</em> Home Assistant 센서 이름</h4><p class="hal-hint">HA 의 <b>개발자 도구 › 상태</b>에서 보이는 이름이에요. 있는 것만 적으면 돼요.</p>',
    quick_fill: '<div data-for="printer equipment other" class="hal-preset">빠르게 채우기: ',
    status_printer_status_power: "⚙️ 상태 <small>프린터 상태 · 전원 스위치 · 플러그 — 가동 시간을 세요</small>",
    sensor_p1s_print_status: "sensor.p1s_print_status 또는 switch.dryer",
    time_left_min: "남은 시간 (분)",
    job_name: "작업 이름",
    s_3_alert_thresholds_blank: '<section class="hal-sec"><h4><em>3</em> 알림 기준 <small>비우면 알리지 않아요</small></h4>',
    humidity_below_input_name: '<div class="hal-two"><label>습도가 이보다 낮으면 (%)<input name="humidity_min" type="number" min="0" max="100" inputmode="numeric" value="',
    placeholder_no_alert: '" placeholder="안 알림"></label>',
    temperature_below_c_input: '<label>온도가 이보다 낮으면 (°C)<input name="temp_min" type="number" inputmode="numeric" value="',
    placeholder_no_alert_2: '" placeholder="안 알림"></label></div>',
    humidity_above_2: '<div class="hal-two"><label>습도가 이보다 높으면 (%)<div class="hal-chips">',
    temperature_above_c_input: '<label>온도가 이보다 높으면 (°C)<div class="hal-chips"></div><input name="temp_max" type="number" inputmode="numeric" value="',
    get_alerts_when_over: '> 기준을 넘으면 알림 받기</label><p class="hal-hint">필라멘트는 보통 습도 20~40% 아래로 둬요 (나일론 · PVA 는 더 낮게).</p></section>',
    s_4_camera_snapshots_when: '<section class="hal-sec"><h4><em>4</em> 카메라 사진 <small>HACS 통합에서 카메라를 골랐을 때</small></h4><label class="hal-chk"><input type="checkbox" name="snap_public"',
    show_snapshots_to_other: '> 🌐 사진을 다른 회원에게 공개</label><p class="hal-hint">끄면 나만 봐요 (기본). 켜면 사이트의 다른 화면(예: 내 프린터)에서 이 사진을 보일 수 있어요. 언제든 끌 수 있어요.</p></section>',
    create_matter_device: " Matter 기기 만들기",
    edit_device: "✏️ 기기 고치기",
    create_and_view_receive: "만들고 받는 키 보기",
    create_and_view_config: "만들고 설정 글 보기",
    delete: '<button type="button" class="hal-btn danger" data-del>🗑 지우기</button>',
    enter_the_first_part: "Home Assistant 에서 이 기기 이름의 앞부분을 적어 주세요.\n예: sensor.p1s_print_status 이면 p1s",
    filled_in_please_check: "채웠어요 — HA 에 그 이름이 있는지 한번 확인해 주세요.",
    delete_this_connection_its: "」 연결을 지울까요? 기록도 같이 지워져요.",
    alias_3ds_send: '- alias: "3ds 보내기 — ',
    devices_node_1_node: "\ndevices:\n  - node: 1            # link.py nodes 에 나오는 노드 번호\n    name: ",
    add_to_3ds_matter: " — 3ds Matter 연결에 넣기",
    s_1_receive_key_like: '<section class="hal-sec"><h4><em>1</em> 받는 키 <small>비밀번호와 같아요 — 남에게 보이지 마세요</small></h4><div class="hal-copy"><span>key</span><code>',
    copy_new_4: '</code><button type="button" class="hal-btn sm pri" data-mtcp="key">📋 복사</button><button type="button" class="hal-btn sm" data-mt-rot title="이 기기의 받는 키만 바꿔요 — 옛 키로는 값이 안 들어와요">🔑 새로</button></div></section>',
    s_2_add_to_config: '<section class="hal-sec"><h4><em>2</em> <code>config/config.yaml</code> 에 넣기 <small>devices 아래에 한 줄씩</small></h4><div class="hal-code"><pre>',
    copy_3: '</pre><button type="button" class="hal-btn sm pri" data-mtcp="conf">📋 복사</button></div>',
    replace_node_with_the: '<p class="hal-hint"><code>node</code> 는 <code>link.py nodes</code> 에 나오는 번호로 바꿔요. 저장하면 30초 안에 보내기 시작하고, 이 화면의 기기가 🟢 로 바뀌어요.</p></section>',
    no_3ds_matter_link: '<section class="hal-sec"><h4>아직 3ds Matter 연결이 없으면</h4><p class="hal-hint"><a href="',
    readme_target_blank_rel_3: '#readme" target="_blank" rel="noopener">📖 설치 안내</a> — 집에 Matter 서버가 있으면 그 주소만, 없으면 라즈베리파이 · 리눅스에 같이 켜요.</p></section>',
    create_a_new_receive: "」의 받는 키를 새로 만들까요? 옛 키로는 값이 더 들어오지 않아요 — 3ds Matter 연결 설정의 key 를 새 키로 바꿔 주세요. (한 줄로 설치한 중계는 다시 켜면 저절로 맞춰요)",
    mqtt_devices_have_no: "MQTT 기기는 설정 글이 없어요 — 받는 곳 › MQTT 카드에서 토픽을 골라요.",
    copy_4: '">📋 복사</button></div></section>',
    paste_into_home_assistant: " — Home Assistant 에 붙여 넣기",
    paste_into_configuration_yaml: "<code>configuration.yaml</code> 에 붙여 넣기",
    if_rest_command_already: "이미 <code>rest_command:</code> 가 있으면 둘째 줄부터 그 아래에",
    paste_into_automations_yaml: "<code>automations.yaml</code> 에 붙여 넣기",
    when_status_changes: " · 상태가 바뀔 때",
    sends: " 보내요",
    s_3_restart_home_assistant: '<section class="hal-sec"><h4><em>3</em> Home Assistant 다시 시작</h4><p class="hal-hint">설정 › 시스템 › 다시 시작. 조금 뒤 이 화면의 기기가 🟢 로 바뀌면 끝이에요.',
    printer_status_also_goes: " 프린터 상태는 「내 프린터」에도 같이 들어가요 (내 프린터의 자동 연결이 켜져 있을 때).",
    create_new_url: '<button type="button" class="hal-btn" data-rotate>🔑 주소 새로 만들기</button>',
    create_a_new_receiving: "받는 주소를 새로 만들까요? 지금 Home Assistant 에 넣어 둔 주소는 더 이상 안 돼요.",
    use_iot_link: "IoT 연결 쓰기",
    add_iot_link_to: "헤더 메인 메뉴에 「IoT 연결」 넣기 (홈 디자인 「메인 메뉴 보이기」와 같은 값)",
    header_menu_name_up: "헤더 메뉴 이름 (12글자까지)",
    devices_one_member_can: "회원 한 명이 연결할 수 있는 기기 (기본 · 1~1000)",
    devices_per_company_default: "업체 하나에 둘 수 있는 기기 (기본 · 그 업체로 분류된 것을 회원 모두 합쳐 · 0 = 막지 않음)",
    exempt_admins_super_admin: "관리자(최고 관리자 · 관리자 역할)는 기기 수 · 업체 한도에서 빼기 (칸을 살 필요 없음)",
    sell_sensor_slots_beyond: "💳 한도를 넘는 센서 칸을 코인 · 마일리지로 팔기 (회원 칸 · 업체 칸)",
    slot_billing: "💳 칸 결제 방식",
    monthly_billing_auto_renew_2: "달마다 결제 (자동 연장)",
    price_per_sensor_coins: "💳 센서 1개 값 — 코인 (0 = 안 팖)",
    price_per_10_sensor: "💳 센서 10개 묶음 값 — 코인 (0 = 안 팖)",
    price_per_sensor_mileage: "💳 센서 1개 값 — 마일리지 (0 = 안 팖)",
    price_per_10_sensor_2: "💳 센서 10개 묶음 값 — 마일리지 (0 = 안 팖)",
    cancel_refund_only_unused: "💳 산 뒤 이 날 수 안 · 안 쓴 칸만 취소(환불) — 0 = 취소 안 받음 (0~30)",
    per_member_member_id: "회원마다 다르게 — 「회원번호 또는 이메일:개수」 쉼표로 (예: 12:50, kim@example.com:100)",
    per_company_company_id: "업체마다 다르게 — 「업체번호:개수」 쉼표로 (예: 3:100, 7:0 · 0 = 막지 않음) · 업체 번호는 업체 주소 /companies/번호",
    sending_mode_3ds_integration: "전송 방식 (통합 「3DSSync」)",
    send_when_values_change: "값이 변하면 보내기 (권장)",
    send_periodically: "주기적으로 보내기",
    on_change_send_when: "「변하면」: 습도가 이만큼(%) 변하면 보냄 (1~10 · 온도는 0.5°C)",
    on_change_send_once: "「변하면」: 변화가 없어도 이만큼(분)마다 한 번 (5~180)",
    periodically_config_text_yaml: "「주기적으로」 · 설정 글(YAML): 값 보내는 주기 (분, 1~60)",
    interval_for_the_screen: "화면이 새 값을 다시 받는 간격 (초, 5~3600 · 0 = 끔)",
    away_when_a_member: "회원이 화면을 이만큼(분) 안 보면 「자리 비움」 (5~1440 · 0 = 끔: 늘 같은 주기)",
    sending_interval_when_away: "자리 비움일 때 값 보내는 주기 (분) — 통합 「3DSSync」이 스스로 늦춤",
    days_to_keep_temp: "온습도 기록을 며칠 둘지 (한 시간에 한 줄)",
    hours_without_activity_before: "몇 시간 소식이 없으면 「끊김」",
    hours_before_resending_a: "같은 기기의 경고를 다시 보내기까지 (시간)",
    increase_device_connection_intervals: "🧯 서버 부하가 높으면 기기 연결 간격을 늘림 (2배 · 4배 — 사이트가 먼저 버티게 · HA 통합 · Matter · MQTT · BT 중계가 따름)",
    site_notification_when_over: "기준을 넘으면 사이트 알림",
    email_too_when_over: "기준을 넘으면 메일도",
    receive_camera_snapshots_latest: "카메라 사진 받기 (기기마다 최신 한 장 · 주인만 봄)",
    shortest_interval_to_receive: "사진을 받는 가장 짧은 간격 (분)",
    pass_print_status_to: "내 프린터로 출력 상태 넘기기",
    link_to_company_owned: "업체 보유 장비에 연결",
    hacs_integration_repository_github: "HACS 통합 저장소 (GitHub 주인/이름)",
    time_zone_e_g: "시간대 (예: Asia/Seoul)",
    use_smartthings_connection: "SmartThings 연결 쓰기",
    app_id_leave_blank: "App ID (비워 두면 회원이 처음 연결할 때 알아서 채워요)",
    values_one_location_can: "위치 하나가 1분에 보낼 수 있는 값 (넘으면 버림, 10~2000)",
    if_no_value_arrives: "값이 이만큼(분) 안 오면 지금 값을 직접 물어보고 구독도 다시 확인 — 값이 그대로인 센서가 「끊김」이 되지 않게 · 끊긴 뒤 저절로 다시 잇기 (스케줄 15분마다 · 15~1440 · 0 = 끔)",
    legacy_also_show_linking: "(예전 방식) 연결 코드로 잇기도 보이기 — WebHook SmartApp 으로 등록했을 때만",
    legacy_link_code_validity: "(예전 방식) 연결 코드를 쓸 수 있는 시간 (분, 5~1440)",
    legacy_also_respond_to: "(예전 방식) 서명 없는 PING 에도 답하기 — 보통은 끔",
    signature_public_key_pem: "서명 공개 키 PEM — 비우면 key.smartthings.com 에서 받아요",
    saved_encrypted_enter_only: "🔒 저장됨 (암호화) — 바꿀 때만 적어요",
    keep_as_is: "●●●●●●●● 그대로 두기",
    client_secret_received_when: "앱을 등록하고 받은 Client Secret",
    not_registered_yet: '<span class="hal-pill">⚪ 아직 등록 전</span>',
    registered_use_smartthings_connection: '<span class="hal-pill wait">⏸ 등록됨 — 「SmartThings 연결 쓰기」가 꺼져 있어요</span>',
    url_confirmed: '<span class="hal-pill on">✅ 주소 확인됨 · ',
    waiting_for_url_confirmation: '<span class="hal-pill wait">⏳ 주소 확인을 기다리는 중</span>',
    create_a_personal_access: "삼성 계정으로 「개인 액세스 토큰」 만들기",
    sign_in_to_account: '<a href="https://account.smartthings.com/tokens" target="_blank" rel="noopener">account.smartthings.com/tokens</a> 에 SmartThings 를 쓰는 삼성 계정으로 로그인 → <b>토큰 생성</b>(Generate new token) → 이름은 아무거나 → 권한에서 <b>애플리케이션</b>(Applications)을 체크 → 만들어진 토큰을 복사해요. 토큰은 24시간만 살아 있어요.',
    paste_the_token_and: "토큰을 붙여 넣고 「⚡ 자동 등록」",
    the_site_creates_the: "사이트가 SmartThings 에 앱 「",
    in_smartthings_saves_the: "」을 만들고, Client ID · Client Secret 을 저장하고, 주소 확인까지 해요. 토큰은 이때 한 번만 쓰고 <b>저장하지 않아요</b>.",
    button_type_button_class: '<div class="hal-copy hal-st-reg"><input type="password" autocomplete="off" spellcheck="false" data-st-pat placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" aria-label="개인 액세스 토큰"><button type="button" class="hal-btn pri" data-st-reg',
    auto_register: ">⚡ 자동 등록</button></div>",
    done_try_connecting_with: "끝 — 내 계정으로 먼저 연결해 보기",
    once_url_confirmed_appears: '위에 <b>✅ 주소 확인됨</b>이 보이면 회원 화면 <a href="',
    smartthings_card_shows_the: "</a> 의 SmartThings 카드에 <b>🔗 SmartThings 연결하기</b> 단추가 생겨요. 회원은 삼성 계정으로 로그인 → 허용 → 센서 고르기만 하면 돼요.",
    open_the_app_registration: "앱 등록 화면 열기",
    developer_center_service_integrations: '<a href="https://developer.smartthings.com/console" target="_blank" rel="noopener">Developer Center</a> › <b>Service Integrations</b> › <b>Register New App</b>. 그 메뉴가 아직 안 보이면 <a href="https://github.com/SmartThingsCommunity/smartthings-cli#readme" target="_blank" rel="noopener">SmartThings CLI</a> 로 아래 명령을 치고 <b>OAuth-In App</b> 을 골라요.',
    paste_the_values_below: "아래 값을 그대로 붙여 넣기",
    members_see_the_name: "이름은 회원이 삼성의 「허용」 화면에서 보게 돼요. 권한(Scopes)은 <b>읽기</b> 두 개만 체크해요.",
    paste_the_client_id: "나온 Client ID · Client Secret 을 아래에 붙여 넣고 저장",
    the_client_secret_is: "<b>Client Secret 은 이때 한 번만 보여요</b> — 바로 복사해 두세요. 「SmartThings 연결 쓰기」도 같이 켜고 <b>저장</b>.",
    url_confirmation: "주소 확인",
    when_the_app_is: "앱을 등록하면 SmartThings 가 사이트로 확인 요청(CONFIRMATION)을 보내고 사이트가 알아서 답해요 — 이 화면을 새로 고치면 <b>✅ 주소 확인됨</b>. 안 바뀌면 Developer Center 의 <b>Confirm Target URL</b> 을 누르거나 <code>smartthings apps:register</code> 를 한 번 더 쳐요.",
    smartthings_connection_api_access: " SmartThings 연결 <small>API Access App · 로그인(OAuth) 방식</small></h2>",
    connected_locations: '<span class="hal-hint">연결한 위치 ',
    linked_to_members: " · 회원과 이은 것 ",
    the_site_url_app: '<p class="hal-warn full">⚠️ 사이트 주소(APP_URL)가 https 가 아니에요 — SmartThings 는 https 주소만 받아요.</p>',
    auto_register_recommended_button: '">⚡ 자동 등록 <small>추천</small></button><button type="button" role="tab" data-rt="manual" class="',
    register_manually: '">📝 직접 등록</button></div>',
    paid_plan_notice_samsung: '<p class="hal-note-pay full" role="note">💳 <b>유료 이용제 안내</b> — 삼성이 2026년 10월부터 SmartThings API 를 유료 플랜으로 바꾸고 있어요 (개인 월 $4.99 · 상업용은 따로). <b>무료 이용이 중지되면 앱 등록 · 회원 연결 · 값 받기가 멈출 수 있어요</b> — 거부되면 Developer Center 에서 플랜을 확인해 주세요. ',
    the_member_screen_s: '회원 화면의 SmartThings 카드 · 연결 방법 · 센서 고르기에도 「무료 이용이 중지될 수 있다」는 안내가 늘 보여요. <a href="',
    advanced_legacy_method_link: '<details class="full hal-st-more"><summary>고급 · 예전 방식 (연결 코드)</summary><div class="hal-form-in">',
    legacy_method_if_you: '<p class="hal-hint full">예전 방식: Developer Workspace 에서 <b>WebHook SmartApp</b>(Automation)으로 등록했다면 Target URL 은 위와 같고',
    still_received_even_if: " (예전 주소 <code>",
    s_25: "</code> 로 등록했어도 계속 받아요)",
    and_turning_on_also: ", 「연결 코드로 잇기도 보이기」를 켜면 회원 화면에 연결 코드 칸이 나와요. 이 방식은 삼성의 배포 승인을 받기 전에는 등록한 계정만 설치할 수 있어요.</p></div></details>",
    the_http_signature_rsa: '<p class="hal-hint full">🔒 SmartThings 가 보내는 모든 요청의 HTTP 서명(rsa-sha256 · Digest · Date)을 확인하고 맞지 않으면 거부해요. 사이트가 받는 권한은 읽기뿐(',
    and_member_tokens_are: ")이고, 회원 토큰은 암호화해 두고 끝나기 전에 새로 받아요.</p></section>",
    general: "⚙️ 기본",
    device_limits: "🔢 기기 한도",
    sensor_slots: "💳 센서 칸",
    sending_values: "📤 값 보내기",
    alerts: "🔔 알림",
    camera_2: "📷 카메라",
    other_extensions: "🔗 다른 확장",
    iot_link_admin_member: '<section class="hal-hero"><div><h1>📡 IoT 연결 — 관리자</h1><p>회원 화면: <a href="',
    members_device_values_receiving: '</a> · 회원 기기의 값 · 받는 주소는 관리자에게도 보이지 않아요</p></div><div class="hal-stats"><span>쓰는 회원 <b>',
    devices_3: "</b></span><span>기기 <b>",
    connected_6: "</b></span><span>🟢 연결됨 <b>",
    history: "</b></span><span>기록 <b>",
    rows: "</b>줄</span><span>",
    s_26: '<div class="hal-seg hal-atabs" role="tablist" aria-label="설정 묶음">',
    rows_2_spellcheck_false: '" rows="2" spellcheck="false" placeholder="비우면 모두 기본값">',
    the_sending_mode_is: '<p class="hal-hint full" data-tg="send">전송 방식은 여기서 정하고 회원의 통합이 따라요 (회원은 주기를 더 길게만 바꿀 수 있어요). 「값이 변하면」: 습도 · 온도가 정한 만큼 변했을 때만 보내고(잇따라 변해도 1분에 한 번까지), 변화가 없으면 가끔 한 번만 — 값이 안정된 보관함은 요청이 줄고, 뚜껑을 열어 습도가 오르면 더 빨리 알아요. 「주기적으로」: 정한 주기마다 보내요 (기기 100대 · 10분이면 한 시간에 600번). 회원이 사이트의 IoT 연결 · 정비 수첩 화면을 한동안 안 보면(자리 비움) 통합이 느린 주기로 바꿔 보내요 — 그동안에도 출력 시작 · 끝 같은 상태 변화는 바로 오고, 습도 경고는 느린 주기만큼 늦어질 수 있어요. 다시 화면을 열면 다음 번 값이 올 때부터 평소 주기로 돌아와요 (설정 글(YAML)로 붙인 기기는 늘 같은 주기) — 요청 하나에 조회 1 · 저장 1~3. 기록은 기기마다 한 시간에 한 줄만 남기고 위 날짜가 지나면 지워요. 받는 주소는 1분에 30번까지만 받아요.</p>',
    save_2: '</div><div class="hal-acts hal-acts-end"><button class="hal-btn pri" id="hal-asave">저장</button></div>',
    please_paste_a_personal: "개인 액세스 토큰을 붙여 넣어 주세요.",
    registering_with_smartthings: "SmartThings 에 등록하는 중…",
    auto_register_2: "⚡ 자동 등록",
    saved: "저장했어요.",
    connecting_with_smartthings: " SmartThings 와 연결하는 중…</div>",
    after_signing_in_click: "로그인한 뒤 「SmartThings 연결하기」를 다시 눌러 주세요.",
    smartthings_connection_cancelled: "SmartThings 연결을 취소했어요.",
    smartthings_didn_t_accept: "SmartThings 가 연결을 받아 주지 않았어요 (",
    loading: '<div class="hal-empty">불러오는 중…</div>',
    iot_link_receives_temp_2: '<section class="hal-hero"><div><h1>📡 IoT 연결</h1><p>Home Assistant · SmartThings · Matter 의 온습도 센서 · 프린터 · 장비 상태를 받아 재고 관리 · 정비 수첩 · 내 프린터에 이어요.</p></div></section><div class="hal-empty">로그인하면 내 기기를 연결할 수 있어요. <a href="/login" data-go>로그인</a></div>',
    first_click_connect_smartthings: "먼저 「🔗 SmartThings 연결하기」를 눌러 주세요 — 연결하면 센서 고르기가 바로 열려요.",
    the_admin_hasn_t_3: "관리자가 아직 SmartThings 연결을 준비하지 않았어요."
   },
   en: {
    sign_in_required: "Sign in required.",
    request_failed: "Request failed.",
    no_value_received_yet: "No value received yet",
    just_now: "just now",
    min_ago: " min ago",
    h_ago: " h ago",
    d_ago: " d ago",
    and: '<li class="more">… and ',
    more: " more</li>",
    storage_box: "Storage box",
    printer: "Printer",
    equipment: "Equipment",
    not_attached_yet: "Not attached yet",
    choose_where_to_attach: "Choose where to attach",
    the_attached_place_is: "The attached place is gone",
    title_click_to_choose: '" title="Click to choose where to attach">',
    change: "Change",
    company: "Company",
    personal: "👤 Personal",
    company_devices_can_only: "🏢 Company devices can only be moved by that company's owner or managers.",
    attach_to: "」 attach to",
    edit_details: '<button type="button" class="hal-btn sm" data-pp-edit>✏️ Edit details</button>',
    here_now: "✅ Here now",
    nowhere_to_attach_create: '<p class="hal-hint">Nowhere to attach — create a storage box in Inventory or add a printer in the Printer Lounge.</p>',
    detach_to_waiting_area: '<button type="button" class="hal-btn sm" data-pp-free>📡 Detach to waiting area</button>',
    printer_lounge: '<a class="hal-btn sm" href="/my-printer" data-go>🖨️ Printer Lounge →</a>',
    waiting_for_values: '<span class="hal-dot wait"></span>Waiting for values',
    the_3ds_mqtt_relay: "The 3ds MQTT relay isn't sending values — check that the PC and MQTT broker are on and the sensor is publishing (it clears itself once values arrive)",
    the_3ds_matter_link: "The 3ds Matter link isn't sending values — check that the PC / Raspberry Pi and the Matter server are on (it clears itself once values arrive)",
    smartthings_hasn_t_sent: "SmartThings hasn't sent values — the site asks for the current value every 15 minutes and reconnects automatically (to do it now, use 「🔄 Reconnect」 · if the device is off, it reconnects once it's on)",
    home_assistant_isn_t: "Home Assistant isn't sending values — check that HA is on and connected to the internet (it clears itself once values arrive)",
    disconnected: '"></span>Disconnected · ',
    please_check_drying_for: "Please check drying for the filament stored here",
    over_the_threshold: "Over the threshold",
    title_threshold: ' title="Threshold ',
    input_type_checkbox_data: '<label class="hal-pick" title="Select"><input type="checkbox" data-sel="',
    select: ' select"></label>',
    s: '<button type="button" class="hal-icobtn pri" data-revive title="🔄 Reconnect" aria-label="Reconnect">🔄</button>',
    title_config_text_home: '" title="📋 Config text (Home Assistant)" aria-label="Config text">📋</button>',
    title_edit_aria_label: '" title="Edit" aria-label="Edit">✏️</button></span></header>',
    s_30_days: "30 days ",
    h: ' h"><i aria-hidden="true">',
    running: "Running",
    idle: "Idle",
    over_threshold: '">⚠️ Over threshold</span>',
    title_view_larger: '" title="View larger"><span>📷 ',
    public: "🌐 Public",
    only_me: "🔒 Only me",
    photo: "📷 Photo · ",
    sensors: "📋 Sensors ",
    s_2: " ",
    my_printers_my_equipment: "My printers · my equipment",
    personal_inventory: "Personal inventory",
    my_filament_resin_storage: "My filament · resin storage boxes",
    company_equipment_company_printers: "Company equipment · company printers · company inventory",
    uncategorized: "Uncategorized",
    sensors_not_categorized_yet: "Sensors not categorized yet",
    auto_follows_attached_place: '<option value="">🔄 Auto (follows attached place',
    cards: "Cards",
    banner: "Banner",
    single_line: "Single line",
    board: "Board",
    buy: "Buy ",
    sensors_2: " sensors · ",
    this_quantity_can_t: "This quantity can't be purchased",
    s_3: '<i class="c on" title="Used slot"></i>',
    unlimited_admin_used: "</b><small>Unlimited (admin) · used <b>",
    slots: "</b> slots",
    purchased: " · 💳 purchased ",
    slots_2: " slots",
    s_4: '<span class="c inf" title="Admins have no limit">∞</span></div></div>',
    purchased_slots: "💳 Purchased slots",
    base_slots: "Base slots",
    in_use: "In use",
    left: "Left",
    s_5: '<i class="c over on" title="Device attached beyond the limit"></i>',
    s_6: '<button type="button" class="c add" data-slot-add title="Buy more slots">＋</button>',
    total: "</b><small>Total <b>",
    slots_base: "</b> slots (base ",
    purchased_2: " + 💳 purchased ",
    used: ") · used <b>",
    left_2: "</b> · left <b>",
    over: " over</span>",
    buy_more_slots: "Buy more slots",
    slot_not_available_yet: "Slot not available yet",
    monthly_billing_auto_renew: "Monthly billing (auto-renew · if turned off, lasts until expiry)",
    buy_once_keep_forever: "Buy once, keep forever",
    free_slots_used_slots: '<p class="hal-gauge-k"><i class="c"></i>Free slots <i class="c on"></i>Used slots <i class="c buy"></i>💳 Purchased slots',
    not_on_sale_now: " · not on sale now",
    admins_are_exempt_from: "Admins are exempt from the device limit, so they don't need to buy slots. Below are the slots purchased so far.",
    sensor_slots_aren_t: "Sensor slots aren't on sale right now. Below are the slots purchased so far.",
    to_attach_more_sensors: '<p class="hal-hint">To attach more sensors beyond the device limit, buy slots — <b>',
    when_slots_expire_attached: "</b>. When slots expire, attached devices are not deleted (only new attachments are blocked).</p>",
    use_for: "<label>Use for<select data-slot-for>",
    my_balance: "My balance ",
    data_go_top_up: '" data-go>Top up →</a>',
    s_7: " ",
    per_item: " (per item ",
    aria_label_one_less: '" aria-label="One less">−</button><input type="number" min="1" max="',
    aria_label_quantity_to: '" aria-label="Quantity to buy"><button type="button" class="hal-btn sm" data-qty-step="1" data-cur="',
    aria_label_one_more: '" aria-label="One more">＋</button></span>',
    no_payment_method_available: '<p class="hal-warn">No payment method available right now (the coin / mileage extension is off or no price is set).</p>',
    purchased_slots_2: '<h4 class="hal-slot-t">Purchased slots</h4><ul class="hal-slotl">',
    until: " until",
    active: "🟢 Active",
    cancelled: "↩️ Cancelled",
    ended: "⚪ Ended",
    sensors_3: " · sensors",
    title_cancel_up_to: '" title="Cancel up to ',
    unused_slots_get_back: " unused slots · get back your share of the price (within ",
    days_of_purchase_cancel: ' days of purchase)">↩️ Cancel</button>',
    can_t_cancel: '<small class="hal-mute">Can\'t cancel — ',
    auto_renew: "> Auto-renew</label>",
    purchased_sensor_slots: "💳 Purchased sensor slots",
    add_sensor_slots: "💳 Add sensor slots",
    how_many_to_cancel: "How many to cancel? (up to ",
    unused_slots: " unused slots)",
    please_enter_a_number: " — please enter a number in that range.",
    cancel_1_sensor_slot: "Cancel 1 sensor slot? You'll get the price back.",
    buy_2: "Buy · ",
    buy_it: " — buy it?",
    needed: "\n(needed ",
    my_balance_2: " · my balance ",
    go_top_up: "\n\nGo top up?",
    show_more: '<button type="button" class="hal-btn hal-more-btn" data-more-btn>Show more</button>',
    relay_install_one_line: " relay install <small>one line · nothing else to install</small></h4>",
    windows_button_type_button: '">🪟 Windows</button><button type="button" role="tab" data-mt-os="sh" class="',
    linux_mac_raspberry_pi: '">🐧 Linux · 🍎 Mac · 🍓 Raspberry Pi</button></div>',
    matter_server_address_for: '<label>Matter server address <small>for HA\'s Matter Server add-on, use HA\'s IP · leave blank to be asked during install</small><input data-mt-addr value="',
    placeholder_e_g_192: '" placeholder="e.g. 192.168.0.10" autocapitalize="off" autocomplete="off" spellcheck="false"></label>',
    terminal: "Terminal",
    copy_new: '</code><button type="button" class="hal-btn sm pri" data-mt-cp>📋 Copy</button><button type="button" class="hal-btn sm" data-rl-any title="Changes this line (link code) — the old line is blocked immediately">🔑 New</button></div>',
    open_a_terminal_ssh: "Open a <b>terminal</b> (SSH works on Raspberry Pi too)",
    start_open_powershell: "Start › open <b>PowerShell</b>",
    s_2_paste_and_press: "</li><li><em>2</em>Paste and press Enter</li><li><em>3</em>Enter the pairing code (optional)</li></ol>",
    on_an_always_on: '<p class="hal-hint">On an always-on device · starts automatically on every boot',
    python3_standard_library_only: " (python3 standard library only · systemd · crontab · launchd on Mac)",
    the_line_contains_your: ". 🔒 The line contains your link code (don't show it to others).</p></section>",
    company_2: "Company ",
    no_server_name_older: "No server name (older integration)",
    no_name: "No name",
    matter_3ds_link: "Matter (3ds link)",
    app_relay_tab: "App · program relay",   // 1.18.0 📱 · 1.19.2 🏢
    trader_how: '<div class="hal-mtg-apps" style="margin-top:10px"><div><b>🏢 3DS Trader</b><span>A shop PC sends instead of a phone — no separate link program (MQTT relay) needed</span></div><div><b>① ⚙ Tools › Options › 📡 Relay</b><span>It fetches the IoT link code of the signed-in account by itself</span></div><div><b>② Turn on 📨 「Also send temp/humidity sensors on the shop MQTT broker」</b><span>Broker · topics follow the MQTT · BT tab here · 🏢 business printer status too</span></div><div><b>③ 💾 Save · keep it running</b><span>Turn on 「start with Windows」 · 「hide in the tray」 in Options › 🖥️ General to keep it sending</span></div></div>',   // 1.19.2 🏢
    app_relay_card: '</span><div><h2>📱 App relay <small>3D SUEÑO Android app · no PC</small></h2><p>An Android phone on your home Wi-Fi sends <b>printer status</b> and <b>📨 MQTT sensor values</b> to this site instead of the PC link program. A spare phone on a charger works well.</p></div>',
    app_relay_how: '<div class="hal-mtg-apps"><div><b>① App › My printers › 📡 Relay mode</b><span>A phone signed in to the 3D SUEÑO app</span></div><div><b>② Turn on printers · 📨 IoT sensors</b><span>Printers: 「Relay with this phone」 · sensors: 「relay too」 (broker · topics come from the MQTT · BT tab)</span></div><div><b>③ ▶ Turn on · 📶 stop power saving</b><span>It sends while the notification stays · remove it from battery optimization</span></div><div><b>💾 Backup</b><span>Settings are kept on the site, encrypted — they load on a new phone</span></div></div><p class="hal-hint">🏠 Pauses when the phone leaves home and resumes when back · 🔀 printers sent by a PC: the PC wins · 📶 Bluetooth · 🧩 Matter · 📤 sending print files need the PC · 🏠 Home Assistant · 🔷 SmartThings need no relay</p>',
    app_relay_none: '<p class="hal-hint">No phone is relaying with the app yet.</p>',
    app_relay_phones: "Relaying phones",
    app_relay_away: "🏠 Away from home",
    app_relay_sensors: "📨 MQTT sensors",
    app_relay_printers: "🖨️ Printers",
    mqtt_bt_3ds_relay: "MQTT · BT (3ds relay)",
    source: ' source">',
    title_source_device_attached: '" title="Source → device → attached place → linked extension">🗺️ Connection map</button>',
    button_type_button_role: '<div class="hal-scope" role="tablist" aria-label="View"><button type="button" role="tab" data-scope="all" class="',
    devices: '">📡 Devices <small>',
    button_type_button_role_2: '<div class="hal-scope" role="tablist" aria-label="Device scope"><button type="button" role="tab" data-scope="all" class="',
    all: '">📡 All <small>',
    my_devices: '">👤 My devices <small>',
    company_devices: '">🏢 Company devices <small>',
    s_8: '<div class="hal-gf hal-cos" role="tablist" aria-label="Company">',
    all_companies: "All companies",
    devices_attached_to_company: '<p class="hal-hint">🏢 Devices attached to company equipment · company printers — the company\'s owner and managers edit them together, staff can only view. Log retention can be set shorter in 🏢 My company › 📡 IoT link.</p>',
    s_9: '<div class="hal-gf hal-src" role="tablist" aria-label="Source">',
    all_sources: "All sources",
    all_2: "All",
    s_10: '<div class="hal-gf hal-srv" role="tablist" aria-label="HA server">',
    all_ha_servers: "All HA servers",
    s_11: '<div class="hal-gf" role="tablist" aria-label="Category">',
    s_12: '<div class="hal-views" role="group" aria-label="View style">',
    view: ' view"><i aria-hidden="true">',
    title_devices_allowed_per: '" title="Devices allowed per company (all members combined: ',
    company_3: ')">Company ',
    all_3: "All",
    connected: "🟢 Connected",
    connected_2: "Connected",
    disconnected_2: "📴 Disconnected",
    disconnected_3: "Disconnected",
    over_2: "⚠️ Over",
    over_threshold_2: "Over threshold",
    waiting: "⏳ Waiting",
    waiting_for_values_2: "Waiting for values",
    name: "Name",
    recent_activity: "Recent activity",
    highest_humidity: "Highest humidity",
    highest_temperature: "Highest temperature",
    problems_first: "Problems first",
    order_added: "Order added",
    s_13: '<select class="hal-gsort" data-gsort aria-label="Sort">',
    none: " — none",
    only: " only",
    filter: ' filter">',
    no_devices_match_these: '<p class="hal-hint">No devices match these filters.</p>',
    s_14: '<div class="hal-more" data-more aria-label="Loading more"><span></span><span></span><span></span></div>',
    all_4: "> All</label>",
    disconnected_only: '<button type="button" class="hal-btn sm" data-sel-stale>Disconnected only (',
    selected_select_class_hal: ' selected</span><select class="hal-sel-grp" data-sel-grp',
    aria_label_move_selected: ' aria-label="Move selected devices to category"><option value="-">📁 Move to category…</option>',
    auto_follows_attached_place_2: '<option value="">🔄 Auto (follows attached place)</option></select><button type="button" class="hal-btn sm danger" data-sel-del',
    delete_cancel: ' delete</button><button type="button" class="hal-btn sm" data-sel-off>Cancel</button></div>',
    above: " above",
    below: " below",
    no_alert: "No alert",
    humidity: "Humidity ",
    low: "Low",
    high: "High",
    temp: "Temp ",
    out_of_range: "Out of range",
    sensor: " sensor.</p>",
    view_only: " <small>(view only)</small>",
    placeholder_no_minimum_input: '" placeholder="No minimum"> <span>~</span> <input type="number" data-r="',
    placeholder_no_maximum: '" placeholder="No maximum"> <b>',
    alerts_when_the_value: '<p class="hal-hint">Alerts when the value leaves this range (goes above or below). Leave a box empty to ignore that side.</p>',
    humidity_2: "💧 Humidity",
    dry_20: "Dry ~20%",
    alerts_off: "Alerts off",
    temperature: "🌡️ Temperature",
    alert_range: "🔔 Alert range",
    save: "Save",
    the_lower_value_must: "The lower value must be smaller than the upper value.",
    more_see_all_in: " more — see all in Inventory",
    resin: "Resin",
    filament: "Filament",
    left_3: " · left ",
    new_unopened_roll: " · new unopened roll",
    title_click_to_set: ' title="🔔 Click to set the alert range (low · high) — 🌡️ ',
    no_temperature_sensor: "No temperature sensor",
    no_humidity_sensor: "No humidity sensor",
    empty: "<u>Empty</u>",
    title_drag_onto_the: '" title="Drag onto the 👤 · 🏢 tabs above to move it whole"',
    location_not_in_inventory: "Location not in Inventory",
    inventory_storage_box: "Inventory storage box",
    empty_2: "Empty",
    sensor_only: "Sensor only",
    storage_location: "Storage location",
    drop_a_sensor_here: '<small class="hal-drop-hint">＋ Drop a sensor here</small>',
    only_the_company_s: "Only the company's owner or managers can move this",
    drag_and_drop_or: "Drag and drop · or tap, then tap where to place it",
    status: "Status",
    temperature_2: "Temperature",
    humidity_3: "Humidity",
    equipment_value: " (equipment value)",
    empty_3: " — empty",
    empty_4: "<small>Empty</small>",
    drag_here: '<small class="hal-hint">Drag here</small>',
    link_off: " · link off",
    no_sensor: "No sensor",
    connected_3: "Connected",
    link_off_2: "Link off",
    printing: "Printing",
    paused: "Paused",
    finished: "Finished",
    failed: "Failed",
    linked_to_company_equipment: "🏭 Linked to company equipment",
    s_15: '"><button type="button" class="hal-sc l" data-sc="-1" aria-label="Left"><i aria-hidden="true"></i></button><div class="hal-bins hal-strip">',
    s_16: '</div><button type="button" class="hal-sc r" data-sc="1" aria-label="Right"><i aria-hidden="true"></i></button></div>',
    s_17: '<span class="hal-own co" title="Company\'s">🏢 ',
    personal_2: '<span class="hal-own me" title="Mine">👤 Personal</span>',
    move_to_personal_another: "Move to personal · another company",
    move_to_company: "Move to company",
    with_filament_sensors_aria: ' (with filament · sensors)" aria-label="Move">⇄</button>',
    title_rename_aria_label: '" title="Rename" aria-label="Rename">✏️</button>',
    sensors_to_waiting_area: "Sensors to waiting area",
    delete_storage_box: "Delete storage box",
    aria_label_delete: '" aria-label="Delete">🗑</button>',
    no_storage_boxes: '<p class="hal-hint">No storage boxes',
    create_one_with_create: " — create one with 「➕ Create storage box」",
    data_board_drag_a: '" data-board><p class="hal-hint">Drag a sensor chip onto where it should attach · on phones, tap the chip and then tap the target. Use ‹ › to scroll long rows (hover over ‹ › while dragging to scroll). Each storage box holds one 🌡️ and one 💧 — if they overlap they swap, and the old sensor goes to the waiting area.</p>',
    data_drop_waiting_area: '" data-drop=""><header><i aria-hidden="true">📡</i><b>Waiting area</b><small>',
    collapsed_drag_here_to: " — collapsed (drag here to detach)",
    sensors_not_attached_yet: "Sensors not attached yet — drag here to detach",
    all_sensors_are_attached: '<small class="hal-hint">All sensors are attached</small>',
    storage_boxes: '<h3 class="hal-bd-t k-box">📦 Storage boxes',
    create_storage_box: '<button type="button" class="hal-btn sm" data-box-act="new">➕ Create storage box</button>',
    printers: '<h3 class="hal-bd-t k-printer">🖨️ Printers</h3>',
    company_equipment: '<h3 class="hal-bd-t k-equip">🏭 Company equipment</h3>',
    nowhere_to_move_it: "Nowhere to move (it's already that side's box).",
    to: "」 to ",
    move_it_whole_filament: " — move it whole?\nFilament · resin inside and attached sensors move with it.",
    it_will_count_toward: "\nIt will count toward company inventory.",
    a_storage_box_with: "\n\n⚠️ A storage box with the same name exists there, so they'll be merged.",
    moved: "Moved.",
    move: "」 move",
    move_where: '<div class="hal-own-pick" role="radiogroup"><span>Move where?</span>',
    move_2: "Move",
    storage_box_name: '<label>Storage box name<input type="text" data-bx-name maxlength="40" placeholder="e.g. Dry box · Drawer 2"></label>',
    whose_storage_box: '<div class="hal-own-pick" role="radiogroup" aria-label="Whose storage box"><span>Whose storage box?</span>',
    storage_box_2: " storage box.</p>",
    create_storage_box_2: "📦 Create storage box",
    create: "Create",
    please_enter_a_storage: "Please enter a storage box name.",
    storage_box_created: "📦 Storage box created.",
    new_name_the_storage: "」 new name (the storage location of rolls · sensors changes too)",
    renamed: "Renamed.",
    has: "」 has ",
    rolls_move_them_in: " rolls — move them in Inventory first, then delete.",
    move_3: "」 — move ",
    sensors_to_the_waiting: " sensors to the waiting area?",
    delete_the_empty_storage: "Delete the empty storage box 「",
    s_18: "」?",
    attached_sensors: "\nAttached sensors (",
    will_go_to_the: ") will go to the waiting area.",
    moved_the_sensors_to: "Moved the sensors to the waiting area.",
    personal_3: "Personal",
    s_19: '<div class="hal-gf hal-mapf" role="tablist" aria-label="Map scope">',
    relay_pc_sends_from: "Relay PC — sends from home to the site",
    printing_2: "🟢 Printing",
    paused_2: "⏸ Paused",
    finished_2: "✅ Finished",
    failed_2: "⚠️ Failed",
    printer_lounge_2: "Printer Lounge",
    print_status_ambient_temp: "Print status · ambient temp/humidity",
    company_equipment_2: "Company equipment",
    equipment_status_temp_humidity: "Equipment status · temp/humidity",
    receives_printer_status_via: "Receives printer status via cloud",
    printer_lounge_link_program: "Printer Lounge link program — printer ⇄ site (status · remote printing)",
    printer_lounge_link_program_2: "Printer Lounge link program — older version that doesn't send the PC name (re-run the line from ⚙ to group it under that PC)",
    running_2: "⚙️ Running",
    idle_2: "⏸ Idle",
    home_assistant_home_sending: "<span><b>Home Assistant</b><small>Sent by the 3DSSync integration</small></span>",
    matter_matter_relay_matter: "<span><b>Matter</b><small>Matter relay — Matter server sensors → site</small></span>",
    mqtt_bt_mqtt_relay: "<span><b>MQTT · BT</b><small>MQTT relay — broker topics · Bluetooth thermo-hygrometers → site</small></span>",
    smartthings_cloud_sensors: "<span><b>SmartThings</b><small>Cloud sensors</small></span>",
    role_button_tabindex_0: '" role="button" tabindex="0" title="Click to edit"',
    waiting_area: "Waiting area ",
    not_attached_yet_2: "Not attached yet",
    storage_boxes_rolls: "Storage boxes · rolls ",
    inventory: "Inventory",
    storage_box_humidity_drying: "Storage box humidity · drying date · alerts",
    maintenance_log: "Maintenance log",
    runtime_maintenance: "Runtime → maintenance",
    s_3ds_server: "3DS server",
    this_site_where_the: "This site — where relay PCs · HA · SmartThings send values",
    relay_pc: "Relay PC",
    source_2: "Source",
    device: "Device",
    attached_to: "Attached to",
    linked_to: "Linked to",
    a_green_line_means: '<div class="hal-map-wrap"><p class="hal-hint">A <b class="hal-map-k on">green</b> line means values are coming in; a <b class="hal-map-k off">gray dotted</b> line means disconnected or no values yet. Hover a node to highlight its links · click a device to edit · click an attached or linked place to open that screen.</p>',
    delete_the: "Delete the ",
    selected_devices_temp_humidity: " selected devices?\nTemp/humidity logs · runtime · photos are deleted too and can't be restored. (SmartThings sensors are excluded from the selection)",
    deleting: "Deleting…",
    ai_suggestions: '<section class="hal-aip"><header><b>🤖 AI suggestions <small>',
    attached_only_when_you: "</small></b><span>Attached only when you click</span>",
    attach_all: '<button type="button" class="hal-btn sm" data-aip-all>✔ Attach all</button>',
    dismiss_all: '<button type="button" class="hal-btn sm ghost" data-aip-x="all">✕ Dismiss all</button></header>',
    attach_button_type_button: '">✔ Attach</button><button type="button" class="hal-btn sm ghost" data-aip-x="',
    aria_label_dismiss: '" aria-label="Dismiss">✕</button></div>',
    iot_link_receives_temp: '<section class="hal-hero"><div><h1>📡 IoT link</h1><p>Receives temp/humidity sensors · printer · equipment status from Home Assistant · SmartThings · Matter and links them to Inventory · Maintenance log · My printers.</p></div>',
    devices_2: '<div class="hal-stats"><span title="Devices you can connect (set by admin)">Devices <b>',
    admin_unlimited: ' <small title="Admins have no device limit">· admin unlimited</small>',
    connected_4: "</span><span>🟢 Connected <b>",
    over_threshold_3: '<span class="hot">⚠️ Over threshold <b>',
    how_to_connect: '<button class="hal-btn ghost" data-guide title="How to connect" aria-label="How to connect">❓ How to connect</button>',
    select_multiple: '<button class="hal-btn ghost" data-sel-on title="Select with checkboxes to move category · delete at once">☑️ Select multiple</button>',
    buy_sensor_slots_with: "Buy sensor slots with coins · mileage · view purchased slots",
    view_cancel_purchased_sensor: "View · cancel purchased sensor slots",
    add_slots: "Add slots",
    purchased_slots_3: "Purchased slots",
    connect_device: ' <button class="hal-btn light" data-new>➕ Connect device</button></div></section>',
    this_screen_fetches_new: "🔄 This screen fetches new values every ",
    min: " min",
    s_20: " s",
    by_itself: " by itself",
    refresh_the_page_to: "🔄 Refresh the page to see new values",
    home_assistant_sends: " (Home Assistant sends ",
    when_values_change: "when values change",
    every: "every ",
    and_right_away_when: ' · and right away when status changes).</p><p class="hal-note">🔒 The receiving URL is like a password — don\'t show it to others. The site never connects to your home; it only receives what your Home Assistant sends.',
    view_filament_drawer_inventory: ' · <a href="/inventory?tab=drawer" data-go>🧵 View filament drawer (Inventory)</a>',
    home_assistant_takes_three: ' Home Assistant takes three steps</h2><ol><li><b>① Install 「3DSSync」 from HACS</b><span>One button adds the repository</span></li><li><b>② Paste the site URL · link code</b><span>Two copy buttons</span></li><li><b>③ 「⚡ Auto-detect and connect」 → OK</b><span>Finds items whose names match your printers · filament storage locations</span></li></ol><div class="hal-row center"><button class="hal-btn pri big" data-new>➕ Connect your first device</button><button class="hal-btn big" data-guide>❓ Illustrated guide</button></div></section>',
    company_devices_can_only_2: "🏢 Company devices can only be edited by that company's owner or managers.",
    matching_sensors: "Matching sensors",
    please_choose_a_sensor: "Please choose a sensor",
    not_linked_to_a: "Not linked to a member",
    needs_attention: "Needs attention",
    heads_up_samsung_is: '<p class="hal-note-pay" role="note">💳 <b>Heads-up</b> — Samsung is moving the SmartThings integration (API) to a <b>paid plan</b> starting October 2026. Depending on Samsung\'s policy, <b>free use may stop and values may no longer come in</b>. ',
    if_values_stop_the: 'If values stop, the device card shows 「Disconnected」, and the card and its history remain. <a href="',
    target_blank_rel_noopener: '" target="_blank" rel="noopener">Samsung SmartThings notice</a></p>',
    expand: "Expand",
    collapse: "Collapse",
    expand_2: "▾ Expand",
    collapse_2: "▴ Collapse",
    s_21: '<div class="hal-srctabs" role="tablist" aria-label="Source">',
    disconnected_4: '<span class="hal-pill bad">⚠️ Disconnected ',
    connected_5: '<span class="hal-pill on">🟢 Connected',
    waiting_for_values_3: '<span class="hal-pill wait">⏳ Waiting for values</span>',
    not_connected: '<span class="hal-pill">Not connected</span>',
    temp_humidity_sensors_printer: "</h2><p>Temp/humidity sensors · printer · equipment status chosen in HA's 「3DSSync」 integration come into the site (the site never connects to HA).</p></div>",
    waiting_area_2: "📡 Waiting area",
    waiting_for_values_4: "Waiting for values",
    no_sensors_linked_via: '<p class="hal-hint">No sensors linked via HA yet — install 「3DSSync」 from HACS and paste the site URL · link code.</p>',
    connect_device_how_to: '<div class="hal-row hal-stc-more"><button type="button" class="hal-btn sm" data-new>➕ Connect device</button><button type="button" class="hal-btn sm" data-guide>❓ How to connect</button></div>',
    to_add_or_remove: '<p class="hal-hint">To add or remove sensors: HA › Settings › Devices & services › 3DSSync › <b>Configure</b>. If a name nearly matches a storage box · printer · equipment, it attaches there; otherwise it goes to 📡 Waiting area.</p></section>',
    matter_3ds_link_the: "</span><div><h2>Matter <small>3ds link</small></h2><p>The 「3ds Matter link」 program at home sends Matter temp/humidity sensors added to Apple Home · Google Home · SmartThings to the site (no Home Assistant · the site never connects to your home).</p></div>",
    install_on_another_device: '</div><details class="hal-mtmore"><summary>💻 Install on another device (Windows · Linux · Mac)</summary>',
    no_sensors_linked_via_2: '<p class="hal-hint">No sensors linked via Matter yet — install the relay on an always-on PC with the line below, and a device is created for each sensor automatically.</p>',
    create_manually_how_to: '<div class="hal-row hal-stc-more"><button type="button" class="hal-btn sm" data-new-mt title="When entering the key directly into the Docker version">🔑 Create manually</button><button type="button" class="hal-btn sm" data-guide-mt>❓ How to connect</button><a class="hal-btn sm" href="',
    readme_target_blank_rel: '#readme" target="_blank" rel="noopener">📖 Install guide</a></div></section>',
    windows_button_type_button_2: '">🪟 Windows</button><button type="button" role="tab" data-mq-os="sh" class="',
    copy_new_2: '</code><button type="button" class="hal-btn sm pri" data-mq-cp>📋 Copy</button><button type="button" class="hal-btn sm" data-rl-any title="Changes this line (link code) — the old line is blocked immediately">🔑 New</button></div>',
    open_a_terminal_ssh_2: "Open a <b>terminal</b> (SSH works too)",
    s_2_paste_and_press_2: "</li><li><em>2</em>Paste and press Enter</li><li><em>3</em>Click <b>➕ Receive</b> on a found sensor</li></ol>",
    linux_mac_receive_mqtt: "🐧🍎 Linux · Mac receive MQTT only — first save <b>⚙️ MQTT broker settings</b> above (python3 standard library only · systemd · crontab · launchd on Mac). ",
    if_you_only_use: "📶 If you only use Bluetooth, this is all you need — no broker settings required. If you also use an MQTT broker, save <b>⚙️ MQTT broker settings</b> above. ",
    on_an_always_on_2: "On an always-on PC near the sensors · broker · starts automatically on every boot. 🔒 The line contains your link code (don't show it to others).</p></section>",
    create_a_new_link: "Create a new link code?\n\n· The lines in use now (🧩 Matter · 📨 MQTT · BT relay · 🏠 HA integration) are blocked immediately — reinstall the relay on your PC with the new line, and enter the new code in the HA integration.\n· Existing devices keep receiving values (each device has its own receive key).",
    copy_the_new_line: " Copy the new line and reinstall.",
    relay_off: '<span class="hal-pill bad">⚠️ Relay off</span>',
    check_broker: '<span class="hal-pill bad">⚠️ Check broker</span>',
    mqtt_broker_only_if: '<div class="hal-mqb sub"><div><b>📮 MQTT broker <small>only if you have one · not needed for Bluetooth only</small></b><small>Something like Mosquitto where Zigbee2MQTT · Tasmota · Shelly values arrive</small></div><button type="button" class="hal-btn sm" data-mq-set>⚙️ MQTT broker settings</button></div>',
    no_broker_address: "No broker address",
    password: " · 🔑 password",
    no_account: "No account",
    topics: " · topics <code>",
    broker_settings: '</code></small></div><button type="button" class="hal-btn sm" data-mq-set>⚙️ Broker settings</button></div>',
    relay: "Relay",
    bluetooth_beta: ' · 📶 Bluetooth <span class="hal-beta" title="Not yet tested with real Bluetooth sensors — let us know if it doesn\'t work">🧪 Beta</span> ',
    listening: "Listening",
    off: "Off",
    none_2: "None",
    click_to_stop_receiving: " · click to stop receiving (device · history stay)",
    click_to_receive: " · click to receive",
    found_sensors: '<h4 class="hal-mqh">🔎 Found sensors <small>',
    click_to_receive_waiting: ' · click to receive (📡 Waiting area) · ✅ receiving</small></h4><div class="hal-mqcs">',
    the_relay_is_searching: "🔎 The relay is searching — Bluetooth thermo-hygrometers · broker topics appear here once they send values.",
    no_sensors_found_yet: "No sensors found yet — install the relay with the line below and nearby 📶 Bluetooth thermo-hygrometers (Windows) and MQTT broker temp/humidity topics will appear here.",
    mqtt_bt_3ds_relay_2: "</span><div><h2>MQTT · BT <small>3ds relay · MQTT broker · 📶 Bluetooth</small></h2><p>The 「3ds relay」 sends temp/humidity from 📶 Bluetooth thermo-hygrometers (Xiaomi · Govee · SwitchBot · BTHome — Windows PC · 🧪 Beta) and your 📮 home MQTT broker (Zigbee2MQTT · Tasmota · Shelly · ESPHome) to the site. Works with Bluetooth alone, no broker needed (no Home Assistant · the site never connects to your home).</p></div>",
    install_on_another_device_2: '<details class="hal-mtmore"><summary>💻 Install on another device (Windows · Linux · Mac)</summary>',
    how_to_connect_2: '<div class="hal-row hal-stc-more"><button type="button" class="hal-btn sm" data-guide-mq>❓ How to connect</button></div></section>',
    one_line_install: "One-line install",
    windows_linux_mac: "Windows · Linux · Mac",
    broker_settings_2: "Broker settings",
    address_account_topics: "Address · account · topics",
    choose_sensors: "Choose sensors",
    pill_buttons: "Pill buttons",
    bluetooth_thermo_hygrometers: "Bluetooth thermo-hygrometers",
    beta_via_windows_relay: "🧪 Beta · via Windows relay PC",
    phone_app_relay: "Relay with a phone",   // 1.17.9 📱 3D SUEÑO app relay mode
    android_no_pc: "Android app · no PC",
    trader_tile: "3DS Trader",   // 1.19.6 🏢 3DS Trader Edition
    trader_tile_sub: "Shop PC · Windows",
    gt_app: "📱 Phone app",   // 1.19.7 ❓ how-to tabs
    gt_trader: "🏢 3DS Trader",
    app_guide_top: '<p class="hal-guide-top">📱 An Android phone on your home Wi-Fi (<b>3D SUEÑO app</b>) sends instead of a PC — temp/humidity sensors on the MQTT broker · 🖨️ printers (Bambu · OctoPrint · Klipper) together. Broker · topics follow ⚙️ Broker settings in the <b>MQTT · BT</b> tab.</p>',
    trader_guide_top: '<p class="hal-guide-top">🏢 If <b>3DS Trader</b> runs on a shop PC, that PC sends — owner · manager accounts only · no separate link program needed. Broker · topics follow ⚙️ Broker settings in the <b>MQTT · BT</b> tab.</p>',
    ha_direct: '<p class="hal-guide-top" data-mtg-top>🏠 Home Assistant sends to this site <b>directly</b> through the <b>3DSSync</b> integration — no relay PC · phone app · 3DS Trader needed.</p>',
    app_relay_guide: '<section class="hal-sec"><h4>📱 Relay with a phone <small>3D SUEÑO Android app · instead of a PC</small></h4><div class="hal-mtg-apps"><div><b>① App › My printers › 📡 Relay mode</b><span>A phone on your home Wi-Fi (a spare phone on a charger works well)</span></div><div><b>② Turn on 📨 IoT sensors 「relay too」</b><span>The link code is filled in automatically · broker and topics come from ⚙️ Broker settings here</span></div><div><b>③ ▶ Turn on</b><span>It sends while the notification stays · shows in Receivers as 「📱 device name (app)」 · remove battery optimization in 📶 Power saving</span></div><div><b>💾 Backup</b><span>Settings are backed up to the site, encrypted — on a new phone they load when you open the relay screen</span></div></div><p class="hal-hint">📶 Bluetooth thermo-hygrometers still need the PC relay. 🏠 Home Assistant · 🔷 SmartThings · 🧩 Matter need no relay or have their own.</p></section>',
    topic_examples: "Topic examples",
    turn_off: "Turn off",
    relay_sensors: "Relay · sensors",
    broker_settings_mqtt_card: '<section class="hal-sec"><h4>⚙️ Broker settings <small>MQTT card › ⚙️ Broker settings</small></h4><div class="hal-mtg-apps">',
    address_port_ip_of: "<div><b>📮 Address · port</b><span>IP of the device running Mosquitto · HA's Mosquitto add-on · usually 1883 (TLS 8883)</span></div>",
    account_same_as_what: "<div><b>👤 Account</b><span>Same as what you enter in MQTT Explorer · 🔒 the password is stored encrypted and never shown again</span></div>",
    topics_means_everything_only: "<div><b>🧾 Topics</b><span><code>#</code> means everything — only ones with temp/humidity are shown</span></div>",
    no_broker_leave_it: "<div><b>📶 No broker?</b><span>Leave it blank and the Windows relay runs on Bluetooth alone</span></div></div></section>",
    choose_sensors_2: '<section class="hal-sec"><h4>🔎 Choose sensors</h4><div class="hal-mtg-apps">',
    pill_button_click_to: "<div><b>➕ Pill button</b><span>Click to turn that sensor into a device — it appears in 📡 Waiting area (or attaches to a storage box · printer with a nearly matching name)</span></div>",
    receiving_click_to_stop: "<div><b>✅ Receiving</b><span>Click to stop receiving · the device and history stay</span></div>",
    mark_a_thermo_hygrometer: "<div><b>📶 Mark</b><span>A thermo-hygrometer heard over Bluetooth</span></div>",
    delete_device_card_delete: "<div><b>🗑 Delete</b><span>Device card ✏️ › Delete — stops receiving that topic</span></div></div></section>",
    bluetooth_thermo_hygrometers_beta: '<section class="hal-sec"><h4>📶 Bluetooth thermo-hygrometers <span class="hal-beta" title="Not yet tested with real Bluetooth sensors — let us know if it doesn\'t work">🧪 Beta</span> <small>The Windows relay PC listens to nearby sensors directly · no pairing · no app</small></h4><div class="hal-mtg-apps">',
    supported_xiaomi_lywsd03mmc_mho: "<div><b>✅ Supported</b><span>Xiaomi LYWSD03MMC · MHO-C401 (pvvx · ATC firmware) · BTHome · Govee H5072 · H5074 · H5075 · SwitchBot Meter (Plus · Outdoor) · Inkbird IBS-TH · older round Xiaomi thermo-hygrometer</span></div>",
    xiaomi_stock_firmware_values: "<div><b>⚠️ Xiaomi stock firmware</b><span>Values are encrypted and can't be read — switch to <b>pvvx firmware</b> in a browser (Telink Flasher · a few minutes)</span></div>",
    requirements_windows_10_11: "<div><b>💻 Requirements</b><span>Windows 10 · 11 PC with Bluetooth 4.0+ · within 10 m of the sensor · no broker needed</span></div>",
    linux_mac_mqtt_only: "<div><b>🐧🍎 Linux · Mac</b><span>MQTT only for now — for Bluetooth, publish to the broker with an ESP32 OpenMQTTGateway · Theengs Gateway and it shows up as is</span></div></div>",
    beta_signal_formats_are: '<p class="hal-hint">🧪 <b>Beta</b> — signal formats are matched per sensor but not yet tested with real sensors. If a sensor doesn\'t appear in found sensors or values look wrong, tell us the model. After install or restart, it shows what it found for 15 seconds · to disable: <code>link.ps1 -NoBle</code></p></section>',
    topic_examples_broker_settings: '<section class="hal-sec"><h4>🧾 Topic examples <small>⚙️ Broker settings › topics to receive (one per line)</small></h4><div class="hal-mtg-apps">',
    esphome_lt_name_gt: "<div><b>ESPHome</b><code>&lt;name&gt;/sensor/#</code></div><div><b>Theengs · OpenMQTTGateway</b><code>home/+/BTtoMQTT/#</code></div><div><b>HA statestream</b><code>homeassistant/sensor/#</code></div></div></section>",
    turn_off_only_what: '<section class="hal-sec"><h4>🔌 Turn off <small>only what you need</small></h4><div class="hal-mtg-apps">',
    turn_off_the_relay: '<div><b>① Turn off the relay</b><span>Stops sending from that PC and removes it · site devices remain as 「Disconnected」</span><code>🪟 powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\\3dsMqtt\\uninstall.ps1"</code><code>🐧🍎 bash ~/.3ds-mqtt/uninstall.sh</code></div>',
    stop_receiving_one_sensor: "<div><b>② Stop receiving one sensor</b><span>Click the ✅ Receiving button on the MQTT card</span></div>",
    delete_a_site_device: "<div><b>③ Delete a site device</b><span>Device ✏️ Edit › 🗑 Delete</span></div></div></section>",
    sensor_mqtt_broker_bluetooth: '<div class="hal-mtg"><p class="hal-mtg-flow">🌡️ Sensor → MQTT broker · 📶 Bluetooth → 💻 relay PC · 📱 phone app · 🏢 3DS Trader → this site <small>no HA · sensors stay in their original app</small></p>',
    hidden_back_to_start: '" hidden><button type="button" class="hal-btn sm hal-mtg-back" data-mtg-back>◀ Back to start</button>',
    broker_address_ip_or: '<section class="hal-sec"><div class="hal-two"><label>Broker address <small>IP or hostname</small><input name="host" value="',
    placeholder_e_g_192_2: '" placeholder="e.g. 192.168.0.54" autocapitalize="off" autocomplete="off" spellcheck="false"></label>',
    port_usually_1883_tls: '<label>Port <small>usually 1883 · TLS 8883</small><input name="port" type="number" min="1" max="65535" inputmode="numeric" value="',
    connect_over_tls_mqtts: "> 🔒 Connect over TLS (mqtts)</label></section>",
    account_leave_blank_if: '<section class="hal-sec"><h4>Account <small>leave blank if the broker accepts anonymous</small></h4><div class="hal-two"><label>Username<input name="user" value="',
    password_input_name_pass: '<label>Password<input name="pass" type="password" value="" placeholder="',
    unchanged_enter_only_to: "Unchanged (enter only to change)",
    leave_blank_if_none: "Leave blank if none",
    clear_the_saved_password: '<label class="hal-chk"><input type="checkbox" name="clear_pass"> Clear the saved password</label>',
    the_password_is_stored: '<p class="hal-hint">🔒 The password is stored encrypted on the site, and only your relay fetches it with the link code (it\'s never shown on this screen again). A read-only account is even better.</p></section>',
    topics_to_receive_one: '<section class="hal-sec"><h4>Topics to receive <small>one per line · up to 10 lines</small></h4><textarea name="topics" rows="3" autocapitalize="off" spellcheck="false">',
    everything_e_g_zigbee2mqtt: '<p class="hal-hint"><code>#</code> = everything · e.g. <code>zigbee2mqtt/+</code> · <code>tele/+/SENSOR</code> · <code>shellies/#</code> — only ones with temperature · humidity appear in 「Found sensors」. If you only use 📶 Bluetooth, you can leave the address blank.</p></section>',
    mqtt_broker_settings: " MQTT broker settings",
    stop_receiving_this_topic: "Stop receiving this topic? The device and its history remain.",
    needs_attention_2: '<span class="hal-pill bad">⚠️ Needs attention</span>',
    choose_sensors_3: '<span class="hal-pill wait">👉 Choose sensors</span>',
    matching: '<span class="hal-pill wait">⏳ Matching</span>',
    not_connected_2: '<span class="hal-pill">⚪ Not connected</span>',
    smartthings_values_from_samsung: "</span><div><h2>SmartThings</h2><p>Values from Samsung SmartThings thermo-hygrometers · plugs · printer devices · door · motion sensors come in as soon as they change.</p></div>",
    the_admin_hasn_t: '<p class="hal-hint">The admin hasn\'t set up the SmartThings connection yet.</p></section>',
    s_1_sign_in_with: '<div class="hal-stc-go"><ol class="hal-stc-steps"><li><em>1</em>Sign in with your Samsung account</li><li><em>2</em>Click 「Allow」</li><li><em>3</em>Choose sensors to receive</li></ol>',
    connect_smartthings_illustrated_guide: '<div class="hal-row"><button type="button" class="hal-btn pri big" data-st-go>🔗 Connect SmartThings</button><button type="button" class="hal-btn big" data-st-guide>❓ Illustrated guide</button></div>',
    the_site_only_reads: '<p class="hal-hint">🔒 The site only reads values (it never turns devices on or off). Your Samsung account password is entered only on Samsung\'s page.</p>',
    smartthings_location: "SmartThings location",
    sensors_4: " · sensors ",
    last_value: " · last value ",
    reconnect: '<button type="button" class="hal-btn sm" data-revive title="Re-checks the subscription and asks for the current value">🔄 Reconnect</button>',
    choose_sensors_button_type: '">⚙️ Choose sensors</button><button type="button" class="hal-btn sm danger" data-st-del="',
    disconnect: '">Disconnect</button></div></div>',
    reconnect_2: ' <button type="button" class="hal-btn sm" data-st-go>🔗 Reconnect</button>',
    no_sensors_chosen_yet: "No sensors chosen yet — click <b>⚙️ Choose sensors</b> and check the sensors to receive.",
    waiting_for_sensor_values: "Waiting for sensor values.",
    connect_another_location: '<button type="button" class="hal-btn sm" data-st-go>➕ Connect another location</button>',
    how_to_connect_3: '<button type="button" class="hal-btn sm" data-st-guide>❓ How to connect</button></div>',
    create_a_new_device: '<option value="">➕ Create a new device (「SmartThings」)</option>',
    link_code: '<div class="hal-stc-code"><div><small>Link code · ',
    min_left_single_use: " min left · single use</small><b data-st-code-v>",
    attach_to_2: "</b><small>Attach to: ",
    new_device_smartthings: "New device 「SmartThings」",
    copy_new_3: '</small></div><div class="hal-row"><button type="button" class="hal-btn pri" data-st-copy>📋 Copy</button><button type="button" class="hal-btn" data-st-new>🔄 New</button></div></div>',
    device_to_pass_values: '<div class="hal-stc-code empty"><label>Device to pass values to<select data-st-dev-new>',
    create_link_code: ">🔑 Create link code</button></div>",
    aria_label_device_to: '" aria-label="Device to pass values to">',
    choose_a_device: '<option value="">— Choose a device —</option>',
    none_yet: "None yet",
    disconnect_2: '">Disconnect</button></div>',
    waiting_for_sensor_values_2: '<p class="hal-hint">Waiting for sensor values. Check that you chose sensors in the SmartThings app.</p>',
    create_link_code_if: "<ol><li><b>「🔑 Create link code」</b> — if you choose the device first, values go into that device.</li>",
    smartthings_app_automations_tab: "<li>SmartThings app → <b>Automations</b> tab → <b>＋</b> → <b>Add routine</b> → tap this site's app under <b>Discover</b> below.</li>",
    enter_the_8_characters: "<li>Enter the 8 characters in the <b>Link code</b> field and tap <b>Next</b> → choose sensors and tap <b>Done</b> → <b>Allow</b>.</li></ol>",
    the_link_code_can: '<p class="hal-hint">The link code can be used once within ',
    minutes_to_change_sensors: " minutes. To change sensors, open that app in the SmartThings app and edit it.</p>",
    legacy_method_link_with: "><summary>🔑 Legacy method — link with a code (SmartApp in the SmartThings app)</summary>",
    going_to_smartthings: "Going to SmartThings…",
    reconnecting: "Reconnecting…",
    disconnect_smartthings_device_cards: "Disconnect SmartThings? Device cards and history remain.",
    choose_smartthings_sensors: "⚙️ Choose SmartThings sensors",
    loading_devices_from_smartthings: '<div class="hal-empty sm">Loading devices from SmartThings…</div>',
    selected: " selected",
    none_selected: "None selected",
    up_to: " — up to ",
    can_be_selected: " can be selected",
    no_receivable_sensors_temperature: '<div class="hal-empty sm">No receivable sensors (temperature · humidity · plug · door · motion …) at this location.<br>Please register sensors in the SmartThings app first.</div>',
    as_a_new_device: '<option value="">➕ As a new device card</option>',
    s_22: '<optgroup label="🖨️ Attach to my printer (shown in the Printer Lounge)">',
    s_23: '<optgroup label="Existing device cards">',
    from_the_printer_lounge: '<p class="hal-to to-printer hal-pk-want"><i aria-hidden="true">🖨️</i><span><small>From the Printer Lounge</small><b>「',
    check_the_plugs_thermo: "」 — check the plugs · thermo-hygrometers to attach</b></span></p>",
    sensors_check_the_ones: "</b> sensors. Check the ones to receive and <b>Save</b>, and values come in as soon as they change. Each sensor becomes one device card.</p>",
    all_thermo_hygrometers_clear: '<div class="hal-pk-tools"><b data-pk-count></b><span><button type="button" class="hal-chip" data-pk-env>🌡️ All thermo-hygrometers</button><button type="button" class="hal-chip" data-pk-none>Clear all</button></span></div>',
    printer_device: ' <em class="hal-pk-tag">Printer device</em>',
    receiving_the_legacy_way: "⚠️ Receiving the legacy way (like a thermo-hygrometer · plug) — set the attach target to <b>My printer</b> and click <b>Save</b> once. ",
    attach_it_to_my: "🖨️ Attach it to My printer and print status · progress · nozzle/bed temperature go to the Printer Lounge card.</small>",
    attach_to_select_data: '<label class="hal-pk-to">Attach to<select data-pk-to="',
    running_when_the_plug: '<section class="hal-sec"><label>🔌 「Running」 when the plug uses more than this power (W) <small>slightly above the printer · dryer standby power — counts runtime (Maintenance log)</small><input type="number" min="0.5" max="5000" step="0.5" inputmode="decimal" data-pk-w value="',
    to_show_it_in: '<p class="hal-hint">🖨️ <b>To show it in the Printer Lounge</b>, choose <b>My printer</b> under 「Attach to」 — plugs show <b>printing · idle</b> by power, and thermo-hygrometers show <b>ambient temperature · humidity</b> on the printer card (progress · time left · camera aren\'t available via SmartThings).</p>',
    the_site_only_reads_2: '<p class="hal-hint">🔒 The site only reads values. Unchecking keeps existing device cards and history (you can delete them from the card\'s ✏️). From the card\'s ✏️ you can set alert thresholds · filament storage box · attach to my printer.',
    you_can_create: " You can create ",
    more_new_device_cards: " more new device cards.",
    copied: "✔ Copied",
    couldn_t_copy_please: "Couldn't copy — please select the text and copy it yourself.",
    back_to_start: '<div class="hal-row hal-mtg-nav"><button type="button" class="hal-btn sm hal-mtg-back" data-mtg-back>◀ Back to start</button>',
    next: '">Next ',
    back_to_start_2: '<button type="button" class="hal-btn sm hal-mtg-back" data-mtg-back>◀ Back to start</button>',
    add_the_repository_to: "Add the repository to HACS <small>first time only</small>",
    in_hacs_top_right: "In HACS, top-right <b>⋮</b> → <b>Custom repositories</b> → paste the URL, set type to <b>Integration</b> → <b>Add</b>. Clicking <b>🧩 Open in my Home Assistant's HACS</b> in the connect dialog skips this step.",
    custom_repositories: '<div class="hal-fake-opt">Custom repositories</div>',
    repository: "Repository",
    type: "Type",
    integration: "Integration",
    add: "Add",
    download_and_restart: "Download and restart",
    open_3ds_click_download: "Open <b>3DSSync</b>, click <b>Download</b>, then <b>restart</b> Home Assistant (Settings › System › Restart). It appears in the integration list only after a restart.",
    integration_sends_temp_humidity: ' · Integration</small></div></div><p class="hal-fake-p">Sends temp/humidity sensors · printer status · camera snapshots to the site.</p><div class="hal-fake-end">',
    download: "⬇ Download",
    settings_system: '</div><div class="hal-fake-note">Settings › System › ',
    restart: "<u>Restart</u>",
    find_3ds_in_add: "Find 「3DSSync」 in Add integration",
    settings_devices_services_bottom: "Settings › Devices & services → bottom-right <b>Add integration</b> → find and click <b>3DSSync</b>. You can also click <b>⚙️ Open 「3DSSync」 Add integration</b> in the connect dialog.",
    home_assistant_devices_services: "Home Assistant · Devices & services",
    integrations: '<b class="hal-fake-t">Integrations</b>',
    s_3ds_3ds_temp_humidity: '<div class="hal-fake-repo"><span class="hal-fake-logo">3DS</span><div><b>3DSSync</b><small>Temp/humidity · printer · equipment status to the site</small></div></div>',
    add_integration: "＋ Add integration",
    paste_the_site_url: "Paste the site URL · link code",
    click_connect_device_on: "Click <b>➕ Connect device</b> on this screen to see both. <b>📋 Copy</b> them, paste into Home Assistant and click <b>OK</b>. The link code is like a password.",
    site_home_assistant: "Site → Home Assistant",
    site_url: "Site URL",
    copy: "📋 Copy",
    link_code_2: "Link code",
    ok: "OK",
    auto_detect_and_connect: "「⚡ Auto-detect and connect」 → OK",
    choose_auto_detect_and: "Choose <b>⚡ Auto-detect and connect</b> at the top, and items whose <b>names match</b> your printers · filament storage locations on the site come pre-checked. Review and click <b>OK</b>. Temperature sensors on the same device are attached automatically.",
    what_to_attach_to: '<b class="hal-fake-t">What to attach to?</b>',
    auto_detect_and_connect_2: '<div class="hal-fake-opt on">◉ ⚡ Auto-detect and connect (recommended)</div>',
    my_printer_one_by: '<div class="hal-fake-opt">○ My printer — one by one</div><hr><b class="hal-fake-t">To connect</b>',
    living_room_bambu_lab: "🖨️ Living room · Bambu Lab P1S ← P1S",
    dry_box_dry_box: "🧵 Dry box ← Dry box humidity",
    living_room_humidity_new: "🧵 Living room humidity (new storage box)",
    attach_printers_equipment_that: "Attach printers · equipment that weren't found <small>only when needed</small>",
    if_names_differ_and: "If names differ and weren't found, add the integration once more and choose <b>My printer — one by one</b> · <b>Company equipment — one by one</b>. <b>Choose a Home Assistant device</b> and it fills in status · progress · camera sensors.",
    home_assistant_3ds_one: "Home Assistant · 3DSSync — one by one",
    device_optional: "Device (optional)",
    choose_sensors_found_ones: '<hr><b class="hal-fake-t">Choose sensors <small>found ones are filled in</small></b>',
    progress: "Progress (%)",
    camera: "Camera",
    finish_on_the_site: "Finish on the site",
    it_appears_on_this: "It appears on this screen in 🟢 within 1–2 minutes. On the card's <b>✏️</b>, set <b>alert thresholds</b> · name · attach target · <b>photo visibility</b>, and in Inventory pick the filament's <b>storage location</b> from the list to show humidity with the filament.",
    site_iot_link_inventory: "Site · IoT link · Inventory",
    dry_box: '<div class="hal-fake-card"><div class="hal-fake-row"><span>🧵 <b>Dry box</b></span>',
    just_now_2: '<div class="hal-fake-st"><i></i>just now</div>',
    storage_location_where_the: '<div class="hal-fake-fld"><small>Storage location <em>🏠 where the temp/humidity sensor is</em></small><span>Dry box ▾</span></div>',
    dry_in_12_days: '<div class="hal-fake-tags"><span>💧 Dry in 12 days</span><span class="ha">🏠 💧32.5% 🌡️23.4°C</span></div>',
    good_to_know: '<section class="hal-sec hal-tips"><h4>💡 Good to know</h4><ul>',
    for_printers_company_equipment: "<li>For <b>printers · company equipment</b>, add the integration once more and choose 「My printer — one by one」 · 「Company equipment — one by one」. Choose a Home Assistant device and it fills in status · progress · camera sensors.</li>",
    to_add_or_remove_2: "<li><b>To add or remove sensors</b>, click <b>Configure</b> on that integration in Home Assistant.</li>",
    to_move_an_attached: "<li><b>To move an attached sensor elsewhere</b>, change 「What to attach to?」 via the card's ✏️ on this screen.</li>",
    if_it_doesn_t: "<li><b>If it doesn't turn 🟢</b>, check that you restarted Home Assistant and that the site URL starts with <code>https://</code>. If it still fails, look for <code>g7_link</code> in Settings › System › Logs.</li>",
    if_you_don_t: "<li>If you don't use HACS, click <b>📝 Use config text without HACS</b> in the connect dialog.</li></ul>",
    illustrations_are_mock_ups: '<p class="hal-hint">Illustrations are mock-ups of the screens. Home Assistant screens may differ slightly by version.</p></section>',
    it_takes_about_5: '<p class="hal-guide-top" data-mtg-top>It takes about <b>5 minutes</b> the first time. Steps in Home Assistant (①–⑥) and on the site (⑦) are shown in order. Click the places marked with a red border <span class="hal-hl sm">like this</span> in order. Click a number below to see only that step.</p>',
    good_to_know_2: "Good to know",
    site: "Site",
    smartthings_thermo_hygrometers_plugs: '</span><span><b>SmartThings</b><small>Thermo-hygrometers · plugs · door · motion sensors</small></span></span><span class="hal-fake-pill">⚪ Not connected</span></div>',
    click_connect_smartthings: "Click 「🔗 Connect SmartThings」",
    it_s_the_button: "It's the button on the <b>SmartThings card</b> at the top of this screen. Clicking it takes you to Samsung SmartThings' sign-in page.",
    site_iot_link: "Site · IoT link",
    connect_smartthings: "🔗 Connect SmartThings",
    sign_in_with_your: "Sign in with your Samsung account",
    sign_in_with_the: "Sign in with the <b>Samsung account</b> you use in the SmartThings app. The password is entered only on Samsung's page — the site can't see it. If you're already signed in, this step is skipped.",
    samsung_account_sign_in: "Samsung account · Sign in",
    email_or_phone_number: "Email or phone number",
    password_2: "Password",
    sign_in: "Sign in",
    choose_a_location_and: "Choose a location and 「Allow」",
    choose_the_location_with: "Choose the <b>location</b> with your sensors (e.g. My home) and click <b>Allow</b> (Authorize). The site only gets <b>view devices · locations</b> (read) permission, so it can't turn devices on or off.",
    smartthings_allow_permissions: "SmartThings · Allow permissions",
    is_requesting: "」 is requesting</b>",
    view_devices_read_values: "View devices <small>(read values)</small>",
    view_locations_name_temperature: "View locations <small>(name · temperature unit)</small>",
    location: "Location",
    my_home: "My home ▾",
    cancel: "Cancel",
    allow: "Allow",
    choose_sensors_to_receive: "Choose sensors to receive",
    back_on_the_site: "Back on the site, the sensor list for that location appears. Check the ones to receive and click <b>Save</b>. <b>Thermo-hygrometers are pre-checked</b>. If a device card with the same name exists, it attaches there; otherwise a new card is created.",
    site_choose_sensors: "Site · ⚙️ Choose sensors",
    dry_box_thermo_hygrometer: "🌡️ <b>Dry box thermo-hygrometer</b> <small>Temp 23.4°C · Humidity 32%</small>",
    dryer_plug_power_120: "🔌 <b>Dryer plug</b> <small>Power 120 W</small>",
    front_door_open_closed: "🚪 Front door <small>open/closed</small>",
    done_set_alert_thresholds: "Done — set alert thresholds · attach target on the card",
    values_appear_on_the: "Values appear on the device card right away and come in whenever they change. On the card's <b>✏️</b>, set the <b>alert threshold</b> (e.g. humidity 40%) and <b>attach target</b> (filament storage box · my printer) to link with Inventory · Maintenance log · My printers.",
    dry_box_thermo_hygrometer_2: '<div class="hal-fake-card"><div class="hal-fake-row"><span>🧵 <b>Dry box thermo-hygrometer</b> <span class="hal-fake-pill st">',
    humidity_above: "Humidity above (%)",
    what_to_attach_to_2: "What to attach to?",
    filament_resin_storage_box: "🧵 Filament · resin storage box — Dry box",
    what_works_for_printers: '<section class="hal-sec hal-sup"><h4>🖨️ What works for printers <small>What appears in the Printer Lounge when you attach SmartThings items to 「🖨️ My printer」</small></h4>',
    bambu_lab_edge_driver: '<div class="hal-sup-w"><table><thead><tr><th></th><th>🖨️ Bambu Lab<small>Edge driver (LAN)</small></th><th>🖨️ Klipper<small>Edge driver (Moonraker)</small></th><th>🔌 Power plug</th><th>🌡️ Thermo-hygrometer</th></tr></thead><tbody>',
    print_start_end_logged: "Print start · end logged automatically",
    by_power: "<small>by power</small>",
    time_left: "Time left",
    estimate: '<i class="y">≈</i><small>estimate</small>',
    print_name: "Print name",
    paused_failed_distinction: "Paused · failed distinction",
    nozzle_bed_temperature: "Nozzle · bed temperature",
    ams_humidity_light: "AMS humidity · light",
    part_fan: "Part fan",
    ambient_temperature_humidity: "Ambient temperature · humidity",
    camera_timelapse: "📷 Camera · timelapse",
    status_reported_by_bambu: '<ul class="hal-sup-st"><li>Status reported by <b>Bambu Lab</b> — <span>printing</span> <span>idle</span>. If progress exceeded 98% at the end it\'s logged as <span class="ok">completed</span>, otherwise <span class="no">stopped</span>.</li>',
    status_reported_by_klipper: '<li>Status reported by <b>Klipper</b> — <span>standby idle</span> <span>printing</span> <span>paused</span> <span class="ok">complete</span> <span class="no">cancelled · error failed</span></li>',
    power_plug_above_the: '<li><b>Power plug</b> — above the set W it\'s <span>printing</span>, below it\'s <span class="ok">completed</span>.</li></ul>',
    printer_devices_are_3d: '<p class="hal-hint">Printer devices are 3D printers registered by installing a <b>community Edge driver</b> on the SmartThings hub (not an official Samsung device type). Values may differ by driver · version; if it shows as <b>🖨️ Printer device</b> in ⚙️ Choose sensors, it can be received. 📷 Camera · timelapse can\'t be received via SmartThings — use the Printer Lounge\'s <b>one-line link</b> or Home Assistant (you can use both for the same printer).</p></section>',
    received_states_what_printers: '<section class="hal-sec hal-sup"><h4>📋 Received states <small>what printers · plugs report</small></h4>',
    to_add_or_remove_3: "<li><b>To add or remove sensors</b>, change the checks in <b>⚙️ Choose sensors</b> on the SmartThings card and save. No need to sign in again.</li>",
    to_receive_sensors_from: "<li>To receive sensors from <b>another home · office (location)</b>, click <b>➕ Connect another location</b> and choose that location on Samsung's page.</li>",
    power_metering_plugs_count: "<li><b>Power-metering plugs</b> count as 「Running」 while using more than the set W (default 10W) — printer · dryer runtime accumulates in the Maintenance log. For plugs without power metering, on = running.</li>",
    to_show_it_in_2: "<li><b>To show it in the Printer Lounge</b>, choose <b>🖨️ My printer</b> under 「Attach to」 in ⚙️ Choose sensors. A <b>power plug</b> on the printer shows printing · idle and print history, and a <b>thermo-hygrometer</b> shows ambient temperature · humidity on the printer card.</li>",
    to_use_it_for: "<li>To use it for <b>filament storage box humidity</b>, choose 「Filament · resin storage box」 via the card's ✏️ and enter the same storage location as on the filament. If the SmartThings sensor name matches the storage location, it attaches automatically.</li>",
    if_the_card_shows: "<li><b>If the card shows ⚠️</b>, click <b>🔗 Reconnect</b> next to the notice and sign in once more. Chosen sensors stay as they are.</li>",
    to_stop_using_it: "<li><b>To stop using it</b>, click <b>Disconnect</b> — device cards and history remain. Removing it from 「Connected services」 in the SmartThings app also disconnects it.</li></ul>",
    illustrations_are_mock_ups_2: '<p class="hal-hint">Illustrations are mock-ups of the screens. Samsung account · SmartThings screens may differ slightly.</p></section>',
    no_app_to_install: '<p class="hal-guide-top" data-mtg-top>No app to install or code to enter — about <b>1 minute</b>. Steps on Samsung\'s page (②③) and on the site (①④⑤) are shown in order. Click the places marked with a red border <span class="hal-hl sm">like this</span> in order. Click a number below to see only that step.</p><div data-mtg-top>',
    what_works_for_printers_2: "What works for printers",
    support_table: "Support table",
    received_states: "Received states",
    bambu_klipper_plug: "Bambu · Klipper · plug",
    windows_linux_mac_raspberry: "Windows · Linux · Mac · Raspberry Pi",
    with_a_matter_server: "With a Matter server too",
    docker_raspberry_pi_nas: "Docker (Raspberry Pi · NAS)",
    add_sensors: "Add sensors",
    pairing_code: "Pairing code",
    site_devices: "Site devices",
    waiting_area_attach: "Waiting area → attach",
    thread_sensors: "Thread sensors",
    border_router: "Border router",
    disconnect_3: "Disconnect",
    turn_off_remove_sensors: "Turn off · remove sensors",
    homes_without_a_matter: '<section class="hal-sec"><h4>🐳 Homes without a Matter server <small>Docker — Raspberry Pi · Linux · NAS</small></h4><ol class="hal-mtg-ol">',
    download_as_in_the: "<li>Download as in the install guide and create <code>config/config.yaml</code> (delete the <code>matter:</code> line)</li><li><code>docker compose --profile server up -d</code> — starts the official Matter server and the relay together</li>",
    below_create_a_device: "<li>Below, <b>🔑 Create a device to enter the key manually</b> → put the receive key under <code>devices:</code> (site <code>",
    if_you_already_have: "</code>)</li><li>If you already have a Matter server, the 💻 one-line install is easier than Docker</li></ol>",
    readme_target_blank_rel_2: '#readme" target="_blank" rel="noopener">📖 Open install guide</a></div></section>',
    add_sensors_enter_the: '<section class="hal-sec"><h4>📲 Add sensors <small>enter the code yourself · expires in a few minutes</small></h4><div class="hal-mtg-apps">',
    apple_home_sensor_turn: "<div><b>🍎 Apple Home</b><span>Sensor › ⚙️ › Turn on pairing mode</span></div><div><b>🟢 Google Home</b><span>Device › ⚙️ › Linked Matter apps & services</span></div><div><b>🔷 SmartThings</b><span>Device › ⋮ › Share with other services</span></div></div>",
    asked_during_install_or: '<p class="hal-hint">Asked during install, or — 🪟 <code>powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\\3dsMatter\\link.ps1" -Pair</code> · 🐧🍎 <code>python3 ~/.3ds-matter/link.py --pair</code> · 🐳 <code>docker compose run --rm -it link pair</code></p></section>',
    site_devices_one_line: '<section class="hal-sec"><h4>📦 Site devices</h4><div class="hal-mtg-apps"><div><b>💻 One-line install</b><span>Creates a device per sensor automatically in 📡 Waiting area — drag it onto a storage box · printer</span></div>',
    docker_version_create_a: "<div><b>🐳 Docker version</b><span>🔑 Create a device to enter the key manually → put the receive key in the config</span></div><div><b>🗑 When deleted</b><span>Devices deleted on the site aren't recreated</span></div></div></section>",
    thread_sensors_border_router: '<section class="hal-sec"><h4>📶 Thread sensors</h4><div class="hal-mtg-apps"><div><b>Border router</b><span>You need something like a HomePod mini · Apple TV · Nest Hub at home</span></div>',
    matter_server_side_on: "<div><b>Matter server side</b><span>On Linux, configure it once to accept IPv6 routes (install guide 「Thread sensors」)</span></div><div><b>Wi-Fi sensors</b><span>Nothing to do</span></div></div></section>",
    disconnect_only_what_you: '<section class="hal-sec"><h4>🔌 Disconnect <small>only what you need — the three are separate</small></h4><div class="hal-mtg-apps">',
    turn_off_the_relay_2: '<div><b>① Turn off the relay</b><span>Stops sending from that device and removes it · site devices remain as 「Disconnected」</span><code>🪟 powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\\3dsMatter\\uninstall.ps1"</code><code>🐧🍎 bash ~/.3ds-matter/uninstall.sh</code><code>🐳 docker compose down</code></div>',
    remove_one_sensor_removes: "<div><b>② Remove one sensor</b><span>Removes it from the Matter server and asks whether to delete the site device too (stays in Apple Home · Google Home)</span><code>🪟 … \\3dsMatter\\link.ps1 -Remove</code><code>🐧🍎 python3 ~/.3ds-matter/link.py --remove</code><code>🐳 docker compose run --rm link remove &lt;node&gt;</code></div>",
    delete_only_the_site: "<div><b>③ Delete only the site device</b><span>Device ✏️ Edit › 🗑 Delete — the relay won't recreate that sensor</span></div></div></section>",
    sensor_matter_server_relay: '<div class="hal-mtg"><p class="hal-mtg-flow">🌡️ Sensor → Matter server → relay → this site <small>no HA · sensors stay in their original app</small></p>',
    how_to_connect_4: "❓ How to connect",
    create_a_device_to: "🔑 Create a device to enter the key manually",
    broker_settings_3: "⚙️ Broker settings",
    connect_now: "➕ Connect now",
    what_can_be_attached: '<section class="hal-sec"><h4>What can be attached</h4><ul class="hal-ct-what">',
    thermo_hygrometers_filament_storage: "<li><i>🌡️</i><span><b>Thermo-hygrometers</b> — filament storage box humidity · temp/humidity around my printer</span></li>",
    power_metering_plugs_printer: "<li><i>🔌</i><span><b>Power-metering plugs</b> — printer · dryer runtime, my printer's printing · completed</span></li>",
    printer_devices_edge_driver: "<li><i>🖨️</i><span><b>Printer devices</b> (Edge driver — Bambu Lab · Klipper) — print status · progress · nozzle/bed temperature</span></li>",
    door_motion_brightness_battery: "<li><i>🚪</i><span><b>Door · motion · brightness · battery …</b> — as values on the device card</span></li></ul>",
    in_choose_sensors_pick: '<p class="hal-hint">In Choose sensors, pick a filament storage box card or <b>🖨️ My printer</b> under <b>「Attach to」</b>. <a href="#" data-guide-st>See the table of what works for printers →</a></p></section>',
    s_1_connect_with_your: '<section class="hal-sec"><h4><em>1</em> Connect with your Samsung account <small>no app to install or code to enter</small></h4>',
    s_1_sign_in_with_2: '<ol class="hal-stc-steps"><li><em>1</em>Sign in with your Samsung account</li><li><em>2</em>Click 「Allow」</li><li><em>3</em>Choose sensors to receive</li></ol>',
    connect_smartthings_2: '<div class="hal-row"><button type="button" class="hal-btn pri big" data-st-go>🔗 Connect SmartThings</button></div>',
    the_admin_hasn_t_2: '<p class="hal-warn">The admin hasn\'t set up the SmartThings connection yet.</p>',
    the_site_only_reads_3: '<p class="hal-hint">🔒 The site only reads values (it never turns devices on or off). Your Samsung account password is entered only on Samsung\'s page.</p></section>',
    s_1_choose_sensors_to: '<section class="hal-sec"><h4><em>1</em> Choose sensors to receive <small>already linked to your Samsung account</small></h4><div class="hal-ct-locs">',
    receiving: "</b><small>Receiving ",
    sensors_5: " sensors",
    needs_attention_3: " · ⚠️ Needs attention",
    choose_sensors_4: '">⚙️ Choose sensors</button></div>',
    for_newly_bought_sensors: '<p class="hal-hint">For newly bought sensors, register them in the SmartThings app and check them here — no need to sign in again.</p>',
    connect_another_location_home: '<div class="hal-row"><button type="button" class="hal-btn sm" data-st-go>➕ Connect another location (home · office)</button></div>',
    copy_2: '">📋 Copy</button></div>',
    connect_device_2: "➕ Connect device",
    s_1_install_3ds_from: '<div data-cpn="ha"><section class="hal-sec"><h4><em>1</em> Install 「3DSSync」 from HACS <small>first time only</small></h4>',
    category_integration_open_in: '&category=integration">🧩 Open in my Home Assistant\'s HACS</a></div>',
    on_the_screen_that: '<p class="hal-hint">On the screen that opens, click <b>Download</b> and restart Home Assistant. If the button doesn\'t work, add <code>https://github.com/',
    type_integration_under_hacs: "</code> (type: Integration) under HACS › Custom repositories.</p></section>",
    s_2_add_the_integration: '<section class="hal-sec"><h4><em>2</em> Add the integration and paste the two values below</h4>',
    config_flow_start_domain: 'config_flow_start/?domain=g7_link">⚙️ Open 「3DSSync」 Add integration</a></div>',
    the_link_code_is: '<p class="hal-hint">🔒 The link code is like a password. If it leaked, use 「Create new code」 below.</p></section>',
    s_3_auto_detect_and: '<section class="hal-sec"><h4><em>3</em> 「⚡ Auto-detect and connect」 → OK</h4><p class="hal-hint">It finds and checks Home Assistant devices · humidity sensors whose names match your <b>printers</b> · filament <b>storage locations</b> on the site. If they match, just click <b>OK</b> — printers get status · progress · camera, storage boxes get humidity · temperature in one go. Anything not found due to different names can be checked manually in the same list or attached 「one by one」. It appears on this screen in 🟢 shortly.</p></section></div>',
    create_a_device_to_2: '<div class="hal-row"><button type="button" class="hal-btn sm" data-ct-mt>🔑 Create a device to enter the key manually (Docker version)</button></div></div>',
    illustrated_guide_create_new: '<button type="button" class="hal-btn" data-guide2>❓ Illustrated guide</button><span data-ha-only><button type="button" class="hal-btn" data-rl>🔑 Create new code</button><button type="button" class="hal-btn" data-manual>📝 Use config text without HACS</button></span>',
    create_a_new_link_2: "Create a new link code? To attach or edit more devices in the Home Assistant integration, you'll need to enter the new code. (Already attached devices keep receiving values)",
    s_24: '</h3><button type="button" class="hal-icobtn" data-x aria-label="Close">✕</button></header>',
    close: '</div><div><button type="button" class="hal-btn" data-x>Close</button>',
    s_1_what_to_attach: '<section class="hal-sec"><h4><em>1</em> What to attach to?</h4><div class="hal-pick">',
    storage_location_same_as: '<div data-for="location"><label>Storage location <small>same as the 「storage location」 on the filament</small><input name="location" list="hal-locs" maxlength="40" value="',
    placeholder_e_g_dry: '" placeholder="e.g. Dry box · AMS · Drawer 2"><datalist id="hal-locs">',
    pick_from_storage_boxes: '<div class="hal-locs"><small>📦 Pick from storage boxes</small>',
    my_printer: '<div data-for="printer"><label>My printer<select name="printer_id">',
    company_equipment_3: '<div data-for="equipment"><label>Company equipment<select name="equipment_id">',
    name_blank_what_you: '<label>Name <small>blank = what you chose above</small><input name="name" maxlength="60" value="',
    placeholder_e_g_living: '" placeholder="e.g. Living room dry box"></label>',
    category_where_it_s: '<label>📁 Category <small>where it\'s grouped on screen — auto follows the attached place</small><select name="grp">',
    smartthings_sensor_this_device: ' SmartThings sensor</h4><p class="hal-hint">This device\'s values come from SmartThings. Change the sensors to receive in <b>⚙️ Choose sensors</b> on the SmartThings card at the top.</p></section>',
    matter_sensor_this_device: ' Matter sensor</h4><p class="hal-hint">This device\'s values come from the <b>3ds Matter link</b> program (no Home Assistant sensor name needed). ',
    put_the_receive_key: "Put the <b>receive key</b> shown after saving into that config.",
    view_receive_key_config: '<a href="#" data-mt-key>🔑 View receive key · config</a>',
    mqtt_topic_this_device: ' MQTT topic</h4><p class="hal-hint">This device\'s values come from the <b>3ds MQTT relay</b>. Change the topics to receive in <b>🔎 Found sensors</b> on Source › MQTT card.</p></section>',
    s_2_home_assistant_sensor: '<section class="hal-sec"><h4><em>2</em> Home Assistant sensor names</h4><p class="hal-hint">The names shown in HA\'s <b>Developer tools › States</b>. Enter only the ones you have.</p>',
    quick_fill: '<div data-for="printer equipment other" class="hal-preset">Quick fill: ',
    status_printer_status_power: "⚙️ Status <small>printer status · power switch · plug — counts runtime</small>",
    sensor_p1s_print_status: "sensor.p1s_print_status or switch.dryer",
    time_left_min: "Time left (min)",
    job_name: "Job name",
    s_3_alert_thresholds_blank: '<section class="hal-sec"><h4><em>3</em> Alert thresholds <small>blank = no alerts</small></h4>',
    humidity_below_input_name: '<div class="hal-two"><label>Humidity below (%)<input name="humidity_min" type="number" min="0" max="100" inputmode="numeric" value="',
    placeholder_no_alert: '" placeholder="No alert"></label>',
    temperature_below_c_input: '<label>Temperature below (°C)<input name="temp_min" type="number" inputmode="numeric" value="',
    placeholder_no_alert_2: '" placeholder="No alert"></label></div>',
    humidity_above_2: '<div class="hal-two"><label>Humidity above (%)<div class="hal-chips">',
    temperature_above_c_input: '<label>Temperature above (°C)<div class="hal-chips"></div><input name="temp_max" type="number" inputmode="numeric" value="',
    get_alerts_when_over: '> Get alerts when over threshold</label><p class="hal-hint">Filament is usually kept below 20–40% humidity (lower for nylon · PVA).</p></section>',
    s_4_camera_snapshots_when: '<section class="hal-sec"><h4><em>4</em> Camera snapshots <small>when a camera is chosen in the HACS integration</small></h4><label class="hal-chk"><input type="checkbox" name="snap_public"',
    show_snapshots_to_other: '> 🌐 Show snapshots to other members</label><p class="hal-hint">Off = only you see them (default). On = they can appear on other site screens (e.g. My printers). You can turn it off anytime.</p></section>',
    create_matter_device: " Create Matter device",
    edit_device: "✏️ Edit device",
    create_and_view_receive: "Create and view receive key",
    create_and_view_config: "Create and view config text",
    delete: '<button type="button" class="hal-btn danger" data-del>🗑 Delete</button>',
    enter_the_first_part: "Enter the first part of this device's name in Home Assistant.\ne.g. for sensor.p1s_print_status, enter p1s",
    filled_in_please_check: "Filled in — please check that those names exist in HA.",
    delete_this_connection_its: "」 — delete this connection? Its history is deleted too.",
    alias_3ds_send: '- alias: "3ds send — ',
    devices_node_1_node: "\ndevices:\n  - node: 1            # node number shown by link.py nodes\n    name: ",
    add_to_3ds_matter: " — add to 3ds Matter link",
    s_1_receive_key_like: '<section class="hal-sec"><h4><em>1</em> Receive key <small>like a password — don\'t show it to others</small></h4><div class="hal-copy"><span>key</span><code>',
    copy_new_4: '</code><button type="button" class="hal-btn sm pri" data-mtcp="key">📋 Copy</button><button type="button" class="hal-btn sm" data-mt-rot title="Changes only this device\'s receive key — values with the old key won\'t come in">🔑 New</button></div></section>',
    s_2_add_to_config: '<section class="hal-sec"><h4><em>2</em> Add to <code>config/config.yaml</code> <small>one line each under devices</small></h4><div class="hal-code"><pre>',
    copy_3: '</pre><button type="button" class="hal-btn sm pri" data-mtcp="conf">📋 Copy</button></div>',
    replace_node_with_the: '<p class="hal-hint">Replace <code>node</code> with the number shown by <code>link.py nodes</code>. After saving it starts sending within 30 seconds, and the device on this screen turns 🟢.</p></section>',
    no_3ds_matter_link: '<section class="hal-sec"><h4>No 3ds Matter link yet?</h4><p class="hal-hint"><a href="',
    readme_target_blank_rel_3: '#readme" target="_blank" rel="noopener">📖 Install guide</a> — if you have a Matter server at home, just its address; otherwise run both on a Raspberry Pi · Linux.</p></section>',
    create_a_new_receive: "」 — create a new receive key? Values with the old key won't come in anymore — replace the key in the 3ds Matter link config with the new one. (A relay installed with the one-line installer adjusts itself on restart)",
    mqtt_devices_have_no: "MQTT devices have no config text — choose topics on Source › MQTT card.",
    copy_4: '">📋 Copy</button></div></section>',
    paste_into_home_assistant: " — paste into Home Assistant",
    paste_into_configuration_yaml: "Paste into <code>configuration.yaml</code>",
    if_rest_command_already: "If <code>rest_command:</code> already exists, put it from the second line under it",
    paste_into_automations_yaml: "Paste into <code>automations.yaml</code>",
    when_status_changes: " · when status changes",
    sends: " sends",
    s_3_restart_home_assistant: '<section class="hal-sec"><h4><em>3</em> Restart Home Assistant</h4><p class="hal-hint">Settings › System › Restart. Once the device on this screen turns 🟢 shortly after, you\'re done.',
    printer_status_also_goes: " Printer status also goes into 「My printers」 (when My printers' auto-link is on).",
    create_new_url: '<button type="button" class="hal-btn" data-rotate>🔑 Create new URL</button>',
    create_a_new_receiving: "Create a new receiving URL? The URL currently in Home Assistant will stop working.",
    use_iot_link: "Use IoT link",
    add_iot_link_to: "Add 「IoT link」 to the header main menu (same value as Home Design 「Show main menu」)",
    header_menu_name_up: "Header menu name (up to 12 characters)",
    devices_one_member_can: "Devices one member can connect (default · 1–1000)",
    devices_per_company_default: "Devices per company (default · all members combined for that company · 0 = no limit)",
    exempt_admins_super_admin: "Exempt admins (super admin · admin role) from device · company limits (no need to buy slots)",
    sell_sensor_slots_beyond: "💳 Sell sensor slots beyond the limit for coins · mileage (member slots · company slots)",
    slot_billing: "💳 Slot billing",
    monthly_billing_auto_renew_2: "Monthly billing (auto-renew)",
    price_per_sensor_coins: "💳 Price per sensor — coins (0 = not for sale)",
    price_per_10_sensor: "💳 Price per 10-sensor bundle — coins (0 = not for sale)",
    price_per_sensor_mileage: "💳 Price per sensor — mileage (0 = not for sale)",
    price_per_10_sensor_2: "💳 Price per 10-sensor bundle — mileage (0 = not for sale)",
    cancel_refund_only_unused: "💳 Cancel (refund) only unused slots within this many days of purchase — 0 = no cancellations (0–30)",
    per_member_member_id: "Per member — 「member ID or email:count」 comma-separated (e.g. 12:50, kim@example.com:100)",
    per_company_company_id: "Per company — 「company ID:count」 comma-separated (e.g. 3:100, 7:0 · 0 = no limit) · company ID is in the company URL /companies/ID",
    sending_mode_3ds_integration: "Sending mode (「3DSSync」 integration)",
    send_when_values_change: "Send when values change (recommended)",
    send_periodically: "Send periodically",
    on_change_send_when: "「On change」: send when humidity changes by this much (%) (1–10 · temperature 0.5°C)",
    on_change_send_once: "「On change」: send once every this many minutes even without change (5–180)",
    periodically_config_text_yaml: "「Periodically」 · config text (YAML): sending interval (min, 1–60)",
    interval_for_the_screen: "Interval for the screen to fetch new values (s, 5–3600 · 0 = off)",
    away_when_a_member: "「Away」 when a member hasn't viewed the screen for this long (min) (5–1440 · 0 = off: always the same interval)",
    sending_interval_when_away: "Sending interval when away (min) — the 「3DSSync」 integration slows down by itself",
    days_to_keep_temp: "Days to keep temp/humidity history (one row per hour)",
    hours_without_activity_before: "Hours without activity before 「Disconnected」",
    hours_before_resending_a: "Hours before resending a warning for the same device",
    increase_device_connection_intervals: "🧯 Increase device connection intervals under high server load (2× · 4× — the site holds up first · HA integration · Matter · MQTT · BT relays follow)",
    site_notification_when_over: "Site notification when over threshold",
    email_too_when_over: "Email too when over threshold",
    receive_camera_snapshots_latest: "Receive camera snapshots (latest one per device · owner only)",
    shortest_interval_to_receive: "Shortest interval to receive snapshots (min)",
    pass_print_status_to: "Pass print status to My printers",
    link_to_company_owned: "Link to company-owned equipment",
    hacs_integration_repository_github: "HACS integration repository (GitHub owner/name)",
    time_zone_e_g: "Time zone (e.g. Asia/Seoul)",
    use_smartthings_connection: "Use SmartThings connection",
    app_id_leave_blank: "App ID (leave blank and it fills in when a member first connects)",
    values_one_location_can: "Values one location can send per minute (excess dropped, 10–2000)",
    if_no_value_arrives: "If no value arrives for this long (min), ask for the current value directly and re-check the subscription — so sensors with unchanged values don't become 「Disconnected」 · reconnects automatically after disconnects (scheduled every 15 min · 15–1440 · 0 = off)",
    legacy_also_show_linking: "(Legacy) Also show linking with a code — only when registered as a WebHook SmartApp",
    legacy_link_code_validity: "(Legacy) Link code validity (min, 5–1440)",
    legacy_also_respond_to: "(Legacy) Also respond to unsigned PING — normally off",
    signature_public_key_pem: "Signature public key PEM — blank = fetched from key.smartthings.com",
    saved_encrypted_enter_only: "🔒 Saved (encrypted) — enter only to change",
    keep_as_is: "●●●●●●●● keep as is",
    client_secret_received_when: "Client Secret received when registering the app",
    not_registered_yet: '<span class="hal-pill">⚪ Not registered yet</span>',
    registered_use_smartthings_connection: '<span class="hal-pill wait">⏸ Registered — 「Use SmartThings connection」 is off</span>',
    url_confirmed: '<span class="hal-pill on">✅ URL confirmed · ',
    waiting_for_url_confirmation: '<span class="hal-pill wait">⏳ Waiting for URL confirmation</span>',
    create_a_personal_access: "Create a 「Personal access token」 with your Samsung account",
    sign_in_to_account: 'Sign in to <a href="https://account.smartthings.com/tokens" target="_blank" rel="noopener">account.smartthings.com/tokens</a> with the Samsung account you use for SmartThings → <b>Generate new token</b> → any name → check <b>Applications</b> under permissions → copy the created token. The token lives for only 24 hours.',
    paste_the_token_and: "Paste the token and click 「⚡ Auto-register」",
    the_site_creates_the: "The site creates the app 「",
    in_smartthings_saves_the: "」 in SmartThings, saves the Client ID · Client Secret, and confirms the URL. The token is used only once and <b>is not saved</b>.",
    button_type_button_class: '<div class="hal-copy hal-st-reg"><input type="password" autocomplete="off" spellcheck="false" data-st-pat placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" aria-label="Personal access token"><button type="button" class="hal-btn pri" data-st-reg',
    auto_register: ">⚡ Auto-register</button></div>",
    done_try_connecting_with: "Done — try connecting with your own account first",
    once_url_confirmed_appears: 'Once <b>✅ URL confirmed</b> appears above, the member screen <a href="',
    smartthings_card_shows_the: "</a> SmartThings card shows the <b>🔗 Connect SmartThings</b> button. Members just sign in with a Samsung account → Allow → choose sensors.",
    open_the_app_registration: "Open the app registration page",
    developer_center_service_integrations: '<a href="https://developer.smartthings.com/console" target="_blank" rel="noopener">Developer Center</a> › <b>Service Integrations</b> › <b>Register New App</b>. If that menu isn\'t visible yet, run the command below in the <a href="https://github.com/SmartThingsCommunity/smartthings-cli#readme" target="_blank" rel="noopener">SmartThings CLI</a> and choose <b>OAuth-In App</b>.',
    paste_the_values_below: "Paste the values below as is",
    members_see_the_name: "Members see the name on Samsung's 「Allow」 page. Check only the two <b>read</b> permissions (Scopes).",
    paste_the_client_id: "Paste the Client ID · Client Secret you get below and save",
    the_client_secret_is: "<b>The Client Secret is shown only once</b> — copy it right away. Also turn on 「Use SmartThings connection」 and click <b>Save</b>.",
    url_confirmation: "URL confirmation",
    when_the_app_is: "When the app is registered, SmartThings sends a confirmation request (CONFIRMATION) to the site and the site answers automatically — refresh this screen to see <b>✅ URL confirmed</b>. If it doesn't change, click <b>Confirm Target URL</b> in Developer Center or run <code>smartthings apps:register</code> once more.",
    smartthings_connection_api_access: " SmartThings connection <small>API Access App · sign-in (OAuth) method</small></h2>",
    connected_locations: '<span class="hal-hint">Connected locations ',
    linked_to_members: " · linked to members ",
    the_site_url_app: '<p class="hal-warn full">⚠️ The site URL (APP_URL) isn\'t https — SmartThings only accepts https URLs.</p>',
    auto_register_recommended_button: '">⚡ Auto-register <small>recommended</small></button><button type="button" role="tab" data-rt="manual" class="',
    register_manually: '">📝 Register manually</button></div>',
    paid_plan_notice_samsung: '<p class="hal-note-pay full" role="note">💳 <b>Paid plan notice</b> — Samsung is moving the SmartThings API to paid plans starting October 2026 (personal $4.99/month · commercial separate). <b>If free use stops, app registration · member connections · receiving values may stop</b> — if rejected, check the plan in Developer Center. ',
    the_member_screen_s: 'The member screen\'s SmartThings card · How to connect · Choose sensors always show a notice that 「free use may stop」. <a href="',
    advanced_legacy_method_link: '<details class="full hal-st-more"><summary>Advanced · legacy method (link code)</summary><div class="hal-form-in">',
    legacy_method_if_you: '<p class="hal-hint full">Legacy method: if you registered a <b>WebHook SmartApp</b> (Automation) in Developer Workspace, the Target URL is the same as above',
    still_received_even_if: " (still received even if registered with the old URL <code>",
    s_25: "</code>)",
    and_turning_on_also: ", and turning on 「Also show linking with a code」 shows the link code field on the member screen. Until Samsung approves distribution, only the registering account can install it.</p></div></details>",
    the_http_signature_rsa: '<p class="hal-hint full">🔒 The HTTP signature (rsa-sha256 · Digest · Date) of every request from SmartThings is verified and rejected if it doesn\'t match. The site only has read permission (',
    and_member_tokens_are: "), and member tokens are stored encrypted and refreshed before they expire.</p></section>",
    general: "⚙️ General",
    device_limits: "🔢 Device limits",
    sensor_slots: "💳 Sensor slots",
    sending_values: "📤 Sending values",
    alerts: "🔔 Alerts",
    camera_2: "📷 Camera",
    other_extensions: "🔗 Other extensions",
    iot_link_admin_member: '<section class="hal-hero"><div><h1>📡 IoT link — Admin</h1><p>Member screen: <a href="',
    members_device_values_receiving: '</a> · Members\' device values · receiving URLs aren\'t visible to admins either</p></div><div class="hal-stats"><span>Active members <b>',
    devices_3: "</b></span><span>Devices <b>",
    connected_6: "</b></span><span>🟢 Connected <b>",
    history: "</b></span><span>History <b>",
    rows: "</b> rows</span><span>",
    s_26: '<div class="hal-seg hal-atabs" role="tablist" aria-label="Setting groups">',
    rows_2_spellcheck_false: '" rows="2" spellcheck="false" placeholder="Blank = all defaults">',
    the_sending_mode_is: '<p class="hal-hint full" data-tg="send">The sending mode is set here and members\' integrations follow it (members can only make the interval longer). 「On change」: sends only when humidity · temperature changes by the set amount (at most once a minute even with rapid changes), and occasionally when there\'s no change — stable storage boxes make fewer requests, and opening a lid that raises humidity is noticed sooner. 「Periodically」: sends at every set interval (100 devices · 10 min = 600 per hour). If a member hasn\'t viewed the site\'s IoT link · Maintenance log screens for a while (away), the integration switches to a slower interval — status changes like print start · end still arrive immediately, while humidity warnings may be delayed by the slower interval. When the screen is opened again, the normal interval resumes from the next value (devices attached via config text (YAML) always use the same interval) — each request costs 1 read · 1–3 writes. History keeps one row per device per hour and is deleted after the days above. The receiving URL accepts up to 30 requests per minute.</p>',
    save_2: '</div><div class="hal-acts hal-acts-end"><button class="hal-btn pri" id="hal-asave">Save</button></div>',
    please_paste_a_personal: "Please paste a personal access token.",
    registering_with_smartthings: "Registering with SmartThings…",
    auto_register_2: "⚡ Auto-register",
    saved: "Saved.",
    connecting_with_smartthings: " Connecting with SmartThings…</div>",
    after_signing_in_click: "After signing in, click 「Connect SmartThings」 again.",
    smartthings_connection_cancelled: "SmartThings connection cancelled.",
    smartthings_didn_t_accept: "SmartThings didn't accept the connection (",
    loading: '<div class="hal-empty">Loading…</div>',
    iot_link_receives_temp_2: '<section class="hal-hero"><div><h1>📡 IoT link</h1><p>Receives temp/humidity sensors · printer · equipment status from Home Assistant · SmartThings · Matter and links them to Inventory · Maintenance log · My printers.</p></div></section><div class="hal-empty">Sign in to connect your devices. <a href="/login" data-go>Sign in</a></div>',
    first_click_connect_smartthings: "First click 「🔗 Connect SmartThings」 — once connected, Choose sensors opens right away.",
    the_admin_hasn_t_3: "The admin hasn't set up the SmartThings connection yet."
   }
  };
  function __loc() { try { return String(localStorage.getItem('g7_locale') || document.documentElement.lang || 'ko').slice(0, 2); } catch (e) { return 'ko'; } }
  function tx(k, v) { var d = T[__loc()] || T.ko; var s = d[k] != null ? d[k] : (T.ko[k] != null ? T.ko[k] : k); return v ? s.replace(/\{(\w+)\}/g, function (m, x) { return v[x] != null ? String(v[x]) : m; }) : s; }

  if (window.__halApp) { window.__halApp.tick(); return; }
  var API = '/api/plugins/custom-iot_link', BASE = '/iot-link', V = '1.18.0';
  var S = { root: null, key: '', d: null, ret: null, deep: false, pickPrinter: 0 };

  // ── 공통 ──
  function token() {
    var t = '';
    try { if (window.G7Core && G7Core.api && typeof G7Core.api.getToken === 'function') t = G7Core.api.getToken() || ''; } catch (e) {}
    if (!t) { try { t = localStorage.getItem('auth_token') || ''; } catch (e2) {} }
    return (!t || t === 'undefined' || t === 'null') ? '' : t;
  }
  function api(method, path, body) {
    var h = { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, t = token(); if (t) h.Authorization = 'Bearer ' + t;
    var m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/); if (m) h['X-XSRF-TOKEN'] = decodeURIComponent(m[1]);
    if (body) h['Content-Type'] = 'application/json';
    return fetch((path.indexOf('/api/') === 0 ? '' : API) + path, { method: method, credentials: 'same-origin', headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || d.success === false) { var e = new Error(d.message || (r.status === 401 ? tx('sign_in_required') : tx('request_failed'))); e.status = r.status; e.data = d.data || null; throw e; } if (method !== 'GET') { try { if (BC) BC.postMessage({ t: 'iot', at: Date.now() }); } catch (er) {} } return d; });
    });
  }
  /* 1.7.20 🔄 같은 브라우저의 다른 탭(재고 관리 서랍 · 업체 재고)과 바로 맞춤 — 바꾸면 알리고, 알림을 받으면 새 값을 받음 */
  var BC = null; try { BC = new BroadcastChannel('g7-boxes'); } catch (e) {}
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(v) { return Number(v || 0).toLocaleString(); }
  function toast(msg, bad) {
    try { if (window.G7Core && G7Core.toast) { G7Core.toast[bad ? 'error' : 'success'](msg); return; } } catch (e) {}
    var t = document.createElement('div'); t.className = 'hal-toast' + (bad ? ' bad' : ''); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  function go(url) { try { if (window.G7Core && typeof G7Core.dispatch === 'function') { G7Core.dispatch({ handler: 'navigate', params: { path: url } }); return; } } catch (e) {} location.href = url; }
  function q(sel) { return S.root.querySelector(sel); }
  function qa(sel) { return Array.prototype.slice.call(S.root.querySelectorAll(sel)); }
  function wrap(html) { S.root.innerHTML = '<div class="hal">' + html + '</div>'; }
  function fail(e) { toast(e.message, true); }
  function find(id) { return S.d.devices.filter(function (x) { return x.id === +id; })[0]; }
  /** 마지막 소식이 얼마나 전인지 */
  function agoText(seen) {
    if (!seen) return tx('no_value_received_yet');
    var m = Math.max(0, Math.round((new Date(S.d.now.replace(' ', 'T')) - new Date(seen.replace(' ', 'T'))) / 60000));
    return m < 2 ? tx('just_now') : m < 60 ? m + tx('min_ago') : m < 1440 ? Math.round(m / 60) + tx('h_ago') : Math.round(m / 1440) + tx('d_ago');
  }
  var ICON = { location: '🧵', printer: '🖨️', equipment: '🏢', other: '📦' };

  /* 📷 카메라 사진 — 주인만 보는 주소라 로그인 정보와 함께 받아 와서 보임. 같은 사진은 다시 받지 않음 */
  var SNAP = {};
  function snapLoad(b) {
    var id = b.getAttribute('data-snap'), at = b.getAttribute('data-at'), c = SNAP[id], show = function (u) { b.style.backgroundImage = 'url(' + u + ')'; };
    if (c && c.url) show(c.url);   // 새 사진을 받는 동안에는 예전 것
    if (c && c.at === at) return;
    var h = {}, t = token(); if (t) h.Authorization = 'Bearer ' + t;
    SNAP[id] = { at: at, url: c && c.url };
    fetch(API + '/devices/' + id + '/snap', { credentials: 'same-origin', headers: h }).then(function (r) { return r.ok ? r.blob() : null; }).then(function (bl) {
      if (!bl) return; var old = SNAP[id].url, u = URL.createObjectURL(bl); SNAP[id].url = u; var el = S.root && S.root.querySelector('[data-snap="' + id + '"]'); if (el) el.style.backgroundImage = 'url(' + u + ')'; if (old) setTimeout(function () { URL.revokeObjectURL(old); }, 2000);
    }).catch(function () {});
  }

  // ── 그리기 ──
  /** 이틀 그래프 — 습도(채움) · 온도(선) · 습도 기준(점선). 값이 2개 넘게 있어야 그림 */
  function spark(d) {
    var h = d.history, W = 240, H = 46, hs = h.filter(function (p) { return p[2] != null; }), ts = h.filter(function (p) { return p[1] != null; });
    if (hs.length < 2 && ts.length < 2) return '';
    var x = function (i) { return (i / Math.max(1, h.length - 1) * W).toFixed(1); };
    var line = function (idx, lo, hi) { var out = []; h.forEach(function (p, i) { if (p[idx] != null) out.push((out.length ? 'L' : 'M') + x(i) + ' ' + (H - 3 - (Math.max(lo, Math.min(hi, p[idx])) - lo) / Math.max(1, hi - lo) * (H - 6)).toFixed(1)); }); return out.join(' '); };
    var tv = ts.map(function (p) { return p[1]; }), tlo = Math.min.apply(null, tv) - 2, thi = Math.max.apply(null, tv) + 2, hp = hs.length > 1 ? line(2, 0, 100) : '';
    var my = d.humidity_max != null ? (H - 3 - d.humidity_max / 100 * (H - 6)).toFixed(1) : null;
    return '<svg class="hal-spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      (hp ? '<path class="f" d="' + hp + ' L' + W + ' ' + H + ' L0 ' + H + ' Z"/><path class="h" d="' + hp + '"/>' : '') + (ts.length > 1 ? '<path class="t" d="' + line(1, tlo, thi) + '"/>' : '') +
      (my != null && hp ? '<line class="m" x1="0" x2="' + W + '" y1="' + my + '" y2="' + my + '"/>' : '') + '</svg>';
  }
  /* 0.2.0 SmartThings — 기기에 이은 센서 값 (온습도 · 상태 밖의 것도) */
  function sensList(list, max) {
    if (!list || !list.length) return '';
    var more = list.length > max ? tx('and') + (list.length - max) + tx('more') : '';
    return '<ul class="hal-sens">' + list.slice(0, max).map(function (x) { return '<li><span><b>' + esc(x.what) + '</b><small>' + esc(x.label) + '</small></span><em>' + esc(x.value) + '</em><time>' + esc(x.at ? agoText(x.at) : '–') + '</time></li>'; }).join('') + more + '</ul>';
  }
  /* 1.2.0 붙인 곳 — 이름 옆 작은 글(잘려서 안 보였음) 대신 카드 한 줄을 다 쓰는 색 띠로. 🖨️ 내 프린터면 누르면 프린터 라운지로, 그 밖에는 누르면 「고치기」 */
  var TO = { location: ['🧵', tx('storage_box')], printer: ['🖨️', tx('printer')], equipment: ['🏢', tx('equipment')], other: ['📦', tx('not_attached_yet')] };
  /* 1.17.1 붙인 곳 — 한 줄짜리 띠 · 누르면 보드처럼 놓을 곳을 그림 단추로 골라 바로 붙임 (data-place → placePick) */
  function toRow(d) {
    var t = TO[d.target] || TO.other, none = d.target === 'other', lost = !none && !d.where;   // 붙였던 프린터 · 장비가 지워짐
    var name = none ? tx('choose_where_to_attach') : lost ? tx('the_attached_place_is') : d.where;
    return '<button type="button" class="hal-to to-' + (none || lost ? 'other' : esc(d.target)) + '" data-place="' + d.id + tx('title_click_to_choose') +
      '<i aria-hidden="true">' + t[0] + '</i><span>' + (none || lost ? '' : '<small>' + esc(t[1]) + '</small>') + '<b>' + esc(name) + '</b></span><em>' + (none || lost ? '＋' : tx('change')) + '</em></button>';
  }
  /* 1.17.1 📍 놓을 곳 고르기 — 보드의 「칩을 누르고 → 놓을 곳 누르기」를 목록(카드 · 한 줄 · 배너)에서도. 팝업은 스크롤 없이 종류 탭 · 12개씩 ‹ › */
  function placeTargets() {
    var d = S.d, out = { location: [], printer: [], equipment: [] }, seen = {}, cos = {};
    (d.companies || []).concat(d.member_companies || []).forEach(function (c) { cos[c.id] = c.name; });
    var who = function (cid) { cid = +(cid || 0); return cid ? '🏢 ' + (cos[cid] || tx('company')) : tx('personal'); };
    var box = function (name, cid) { cid = +(cid || 0); var k = cid + '|' + bkey(name); if (!name || seen[k]) return; seen[k] = 1; out.location.push({ drop: 'location', loc: name, ref: cid, icon: '🧵', name: name, sub: who(cid) }); };
    (d.boxes || []).forEach(function (b) { box(b.name, b.company_id); });
    if (!(d.boxes || []).length) (d.locations || []).forEach(function (l) { box(l, 0); });
    d.devices.forEach(function (x) { if (x.target === 'location') box(x.location, x.company_id); });
    var linked = {};
    (d.printers || []).forEach(function (p) { if (p.equipment_id) linked[p.equipment_id] = 1; out.printer.push({ drop: 'printer', ref: p.id, icon: '🖨️', name: p.name, sub: who(p.company_id) }); });
    (d.equipment || []).forEach(function (e) { if (!linked[e.id]) out.equipment.push({ drop: 'equipment', ref: e.id, icon: e.is_printer ? '🖨️' : '🏭', name: e.name, sub: (e.kind_label || '') + (e.company_id ? ' · ' + who(e.company_id) : '') }); });
    return out;
  }
  function placePick(id) {
    var x = find(id); if (!x) return;
    if (x.perm === 'view') { toast(tx('company_devices_can_only'), true); return; }
    var all = placeTargets(), kinds = [['location', '🧵', tx('storage_box')], ['printer', '🖨️', tx('printer')], ['equipment', '🏭', tx('equipment')]].filter(function (k) { return all[k[0]].length; });
    var tab = kinds.some(function (k) { return k[0] === x.target; }) ? x.target : (kinds[0] || ['location'])[0], page = 0, PER = 12;
    var here = function (t) { return t.drop === x.target && (t.drop === 'location' ? bkey(t.loc) === bkey(x.location) && t.ref === +(x.company_id || 0) : t.ref === (t.drop === 'printer' ? x.printer_id : x.equipment_id)); };
    var ov = modal('📍 「' + esc(x.name) + tx('attach_to'), '<div data-pp></div>', { left: tx('edit_details') });
    var draw = function () {
      var list = all[tab] || [], pages = Math.max(1, Math.ceil(list.length / PER)); page = Math.min(page, pages - 1);
      ov.querySelector('[data-pp]').innerHTML = (kinds.length > 1 ? '<div class="hal-gf hal-pp-tabs" role="tablist">' + kinds.map(function (k) { return '<button type="button" role="tab" data-pp-tab="' + k[0] + '" class="' + (tab === k[0] ? 'on' : '') + '" aria-selected="' + (tab === k[0]) + '"><i aria-hidden="true">' + k[1] + '</i>' + k[2] + '<em>' + all[k[0]].length + '</em></button>'; }).join('') + '</div>' : '') +
        (list.length ? '<div class="hal-pp-grid">' + list.slice(page * PER, page * PER + PER).map(function (t, i) { return '<button type="button" class="hal-pp' + (here(t) ? ' on' : '') + '" data-pp-i="' + (page * PER + i) + '"><i aria-hidden="true">' + t.icon + '</i><b>' + esc(t.name) + '</b><small>' + (here(t) ? tx('here_now') : esc(t.sub)) + '</small></button>'; }).join('') + '</div>' : tx('nowhere_to_attach_create')) +
        '<div class="hal-pp-foot">' + (pages > 1 ? '<button type="button" class="hal-btn sm" data-pp-pg="-1"' + (page ? '' : ' disabled') + '>‹</button><span>' + (page + 1) + ' / ' + pages + '</span><button type="button" class="hal-btn sm" data-pp-pg="1"' + (page < pages - 1 ? '' : ' disabled') + '>›</button>' : '') +
        (x.target !== 'other' ? tx('detach_to_waiting_area') : '') + (x.target === 'printer' && x.where ? tx('printer_lounge') : '') + '</div>';
    };
    draw();
    ov.addEventListener('click', function (e) {
      var tb = e.target.closest('[data-pp-tab]'); if (tb) { tab = tb.getAttribute('data-pp-tab'); page = 0; draw(); return; }
      var pg = e.target.closest('[data-pp-pg]'); if (pg) { page += +pg.getAttribute('data-pp-pg'); draw(); return; }
      var go = function (z) { ov.__close(); placeTo(id, z); };
      var it = e.target.closest('[data-pp-i]');
      if (it) { var t = all[tab][+it.getAttribute('data-pp-i')], z = document.createElement('div'); z.setAttribute('data-drop', t.drop); if (t.loc) z.setAttribute('data-loc', t.loc); z.setAttribute('data-ref', String(t.ref)); go(z); return; }
      if (e.target.closest('[data-pp-free]')) { var f = document.createElement('div'); f.setAttribute('data-drop', ''); go(f); return; }
      if (e.target.closest('[data-pp-edit]')) { ov.__close(); form(x); }
    });
  }
  function card(d) {
    var st = d.source === 'smartthings', mt = d.source === 'matter', mq = d.source === 'mqtt', ne = st || mt || mq, hasHum = d.entities.hum || (ne && d.humidity != null), hasTemp = d.entities.temp || (ne && d.temp != null);   // 1.10.0 🧩 Matter 도 센서 이름 없이 값으로
    var hasEnv = hasTemp || hasHum, hasState = !!d.entities.state || (ne && !!d.state);
    // 1.1.0 위에 크게 보이는 온도 · 습도와 같은 줄은 센서 목록에서 뺌 (두 센서가 한 카드에 붙었으면 견줘 볼 수 있게 둠)
    var all = d.sensors || [], one = function (cap) { return all.filter(function (x) { return x.capability === cap; }).length === 1; };
    var sens = all.filter(function (x) { return !((x.capability === 'temperatureMeasurement' && hasTemp && one(x.capability)) || (x.capability === 'relativeHumidityMeasurement' && hasHum && one(x.capability))); });
    var stt = d.never ? tx('waiting_for_values') : d.stale ? '<span class="hal-dot off" title="' + (mq ? tx('the_3ds_mqtt_relay') : mt ? tx('the_3ds_matter_link') : st || (d.sensors && d.sensors.length) ? tx('smartthings_hasn_t_sent') : tx('home_assistant_isn_t')) + tx('disconnected') + agoText(d.seen) : '<span class="hal-dot on"></span>' + agoText(d.seen);
    var rv = recvOf(d);   // 1.8.1 🎨
    // 1.17.1 정리 — 아래 줄(상태 · 단추)을 없애고 상태는 이름 밑 · 📋 🔄 ✏️ 는 머리 오른쪽 · 경고는 값 옆 작은 알약 (카드가 길고 들쭉날쭉하던 것)
    var revive = (st || (d.sensors && d.sensors.length)) && d.stale, yaml = !st && !(d.sensors && d.sensors.length);
    var hotT = d.target === 'location' ? tx('please_check_drying_for') : tx('over_the_threshold');
    var val = function (k, icon, v, unit, max) { var hot = max != null && v != null && v > max; return '<div class="' + k + (hot ? ' hot' : '') + '"' + (max != null ? tx('title_threshold') + max + unit + '"' : '') + '><i aria-hidden="true">' + icon + '</i><b>' + (v == null ? '–' : v) + '</b><u>' + unit + '</u></div>'; };
    return '<article class="hal-card' + (rv ? ' srv' : '') + (d.over ? ' over' : '') + (d.stale && !d.never ? ' stale' : '') + (S.sel && S.sel[d.id] ? ' picked' : '') + '"' + (rv ? ' style="--srv:' + rv.col + '"' : '') + '>' + recvTag(d) +
      '<header>' + (S.sel ? tx('input_type_checkbox_data') + d.id + '"' + (S.sel[d.id] ? ' checked' : '') + ' aria-label="' + esc(d.name) + tx('select') : '') + '<span class="hal-ico">' + ICON[d.target] + '</span><div><b title="' + esc(d.name) + '">' + esc(d.name) + '</b><small>' + (mq ? '<span class="hal-badge mq">' + mqLogo() + ' MQTT · BT</span>' : mt ? '<span class="hal-badge mt">' + mtLogo() + ' Matter</span>' : st || (d.sensors && d.sensors.length) ? '<span class="hal-badge">' + stLogo() + ' SmartThings</span>' : '<span class="hal-badge ha">' + haLogo() + ' Home Assistant</span>') + '<span class="hal-st">' + stt + '</span></small></div>' +
      '<span class="hal-acts">' + (revive ? tx('s') : '') + (yaml ? '<button type="button" class="hal-icobtn" data-yaml="' + d.id + tx('title_config_text_home') : '') + '<button class="hal-icobtn" data-edit="' + d.id + tx('title_edit_aria_label') + toRow(d) +
      '<div class="hal-vals">' +
        (hasHum ? val('h', '💧', d.humidity, '%', d.humidity_max) : '') + (hasTemp ? val('t', '🌡️', d.temp, '°C', d.temp_max) : '') +
        (hasState ? '<div class="st' + (d.is_on ? ' run' : '') + '" title="' + (d.state ? esc(d.state) + ' · ' : '') + tx('s_30_days') + d.hours_30d + tx('h') + (d.is_on ? '⚙️' : '⏸') + '</i><b>' + (d.is_on ? tx('running') : tx('idle')) + '</b></div>' : '') +
        (d.over ? '<span class="hal-hot" title="' + hotT + tx('over_threshold') : '') +
      '</div>' + (hasEnv ? spark(d) : '') + xtra(d, sens) + '</article>';
  }
  /* 1.17.1 키가 큰 것(📷 카메라 사진 · 📋 센서 목록)은 한 줄로 접어 둠 — 누르면 펼침 · 펼친 것은 다시 그려도 그대로 (S.xo) */
  function xtra(d, sens) {
    var snap = d.snap_at ? '<button type="button" class="hal-snap" data-snap="' + d.id + '" data-at="' + esc(d.snap_at) + tx('title_view_larger') + esc(agoText(d.snap_at)) + ' · ' + (d.snap_public ? tx('public') : tx('only_me')) + '</span></button>' : '';
    if (!snap && !sens.length) return '';
    var lb = [snap ? tx('photo') + esc(agoText(d.snap_at)) : '', sens.length ? tx('sensors') + sens.length + tx('s_2') : ''].filter(Boolean).join(' · ');
    return '<details class="hal-xtra" data-xtra="' + d.id + '"' + (S.xo && S.xo[d.id] ? ' open' : '') + '><summary>' + lb + '</summary>' + snap + sensList(sens, 6) + '</details>';
  }
  /* 1.4.5 ☑️ 여러 개 지우기 — 체크 박스로 고르고 한 번에. 고른 것(S.sel)은 화면을 새로 그려도 남음 */
  /* 1.4.6 📁 분류 — 🛠 장비 · 📦 개인 재고 · 🏢 업체마다 · ❓ 미분류 (회원이 고른 것 · 없으면 붙인 곳 따라) */
  function groups() {
    var d = S.d, out = [['equip', '🛠', tx('equipment'), tx('my_printers_my_equipment')], ['mine', '📦', tx('personal_inventory'), tx('my_filament_resin_storage')]];
    var seenC = {};   // 1.5.0 속한 업체 모두 (직원은 보기만)
    (d.companies || []).concat(d.member_companies || []).forEach(function (c) { if (seenC[c.id]) return; seenC[c.id] = 1; out.push(['c' + c.id, '🏢', c.name, tx('company_equipment_company_printers')]); });
    out.push(['none', '❓', tx('uncategorized'), tx('sensors_not_categorized_yet')]);
    return out;
  }
  function grpName(k) { var g = groups().filter(function (x) { return x[0] === k; })[0]; return g ? g[1] + ' ' + g[2] : ''; }
  function grpOpts(cur, auto) { return (auto ? tx('auto_follows_attached_place') + (auto === 'new' ? '' : ' — ' + esc(grpName(auto))) + ')</option>' : '') + groups().map(function (g) { return '<option value="' + g[0] + '"' + (cur === g[0] ? ' selected' : '') + '>' + g[1] + ' ' + esc(g[2]) + '</option>'; }).join(''); }
  /* 1.4.6 보기 — 고른 분류(전체 · 분류 하나) · 모양(▦ 카드 · ☰ 한 줄 · ▬ 배너) 기억 */
  function pref(k, def) { try { return localStorage.getItem('hal:' + k) || def; } catch (e) { return def; } }
  function setPref(k, v) { try { localStorage.setItem('hal:' + k, v); } catch (e) {} }
  var VIEWS = [['card', '▦', tx('cards')], ['banner', '▬', tx('banner')], ['row', '☰', tx('single_line')], ['board', '📦', tx('board')]];   // 1.6.0 📦 보관함 보드 · 1.17.2 배너 ↔ 한 줄 자리 바꿈
  /* 1.4.8 💳 센서 칸 사기 — 1개 · 10개 묶음 · 코인 · 마일리지 · 나 또는 내 업체 */
  /* 1.8.3 💳 개수를 정해 살 때 값 — 서버(Points::total)와 같은 셈: 10개마다 묶음 값(있으면) + 나머지는 1개 값 */
  function slotTotal(c, q) { var one = +c.unit || 0, ten = +c.pack || 0, packs = ten > 0 ? Math.floor(q / 10) : 0, rest = q - packs * 10; return rest > 0 && one <= 0 ? 0 : packs * ten + rest * one; }
  function slotFmt(c, v) { var p = (c.prices || [])[0]; var unit = p && /[^\d,\s]+$/.test(p.text) ? p.text.match(/[^\d,\s]+$/)[0] : (c.key === 'coin' ? 'C' : 'P'); return n(v) + unit; }
  function slotBtnText(c, q) { var t = slotTotal(c, q); return t > 0 ? tx('buy') + q + tx('sensors_2') + slotFmt(c, t) : tx('this_quantity_can_t'); }
  /* 1.8.6 📊 칸 그림 — 기본 칸 · 💳 구매한 칸 · 채움 = 쓰는 칸 · 빈 칸 = 남은 칸 · 넘은 만큼은 빨강 · 끝에 ＋ 칸 추가(판매 중) */
  function slotGauge(u, selling) {
    var used = +u.used || 0, b = +u.bought || 0;
    if (u.unlimited) {   // 1.9.1 무제한도 쓰는 칸은 그림으로 (끝에 ∞)
      var uc = ''; for (var k = 0; k < Math.min(used, 60); k++) uc += tx('s_3');
      return '<div class="hal-gauge"><div class="hal-gauge-h"><b>' + esc(u.label) + tx('unlimited_admin_used') + used + tx('slots') + (b ? tx('purchased') + b + tx('slots_2') : '') + '</small></div><div class="hal-gauge-c">' + uc + (used > 60 ? '<small>+' + (used - 60) + '</small>' : '') + tx('s_4');
    }
    var base = +u.base || 0, tot = base + b, left = Math.max(0, tot - used), over = Math.max(0, used - tot), MAX = 60, cells = '';
    if (tot + over <= MAX) {
      for (var i = 0; i < tot; i++) cells += '<i class="c' + (i >= base ? ' buy' : '') + (i < used ? ' on' : '') + '" title="' + (i >= base ? tx('purchased_slots') : tx('base_slots')) + ' · ' + (i < used ? tx('in_use') : tx('left')) + '"></i>';
      for (var j = 0; j < over; j++) cells += tx('s_5');
    } else cells = '<span class="hal-gauge-bar"><i style="width:' + Math.min(100, Math.round(used * 100 / Math.max(1, tot))) + '%"></i></span>';
    if (selling) cells += tx('s_6');
    return '<div class="hal-gauge"><div class="hal-gauge-h"><b>' + esc(u.label) + tx('total') + tot + tx('slots_base') + base + (b ? tx('purchased_2') + b : '') + tx('used') + used + tx('left_2') + left + '</b>' + (over ? ' · <span class="hal-over">⚠️ ' + over + tx('over') : '') + '</small></div><div class="hal-gauge-c">' + cells + '</div></div>';
  }
  /* 1.9.1 칸 줄을 줄 끝까지 — 가진 칸 · ＋ 뒤로 흐린 칸(아직 없는 칸)을 채워 한 줄이 꽉 차게 (너비가 바뀌면 다시) */
  function slotFill(ov) {
    var fill = function () {
      Array.prototype.forEach.call(ov.querySelectorAll('.hal-gauge-c'), function (c) {
        Array.prototype.forEach.call(c.querySelectorAll('.c.ghost'), function (g) { g.remove(); });
        var items = c.querySelectorAll('.c'); if (!items.length || c.querySelector('.c.inf')) return;   // 1.9.4 무제한(∞) 줄은 채우지 않음
        var w = c.clientWidth, cell = 22, per = Math.max(1, Math.floor((w + 4) / cell)), n = 0;
        Array.prototype.forEach.call(items, function (i) { n += Math.max(1, Math.ceil((i.offsetWidth + 4) / cell - 0.05)); });
        var need = (per - (n % per)) % per; if (n < per) need = per - n;
        var buy = !!c.querySelector('.c.add');   // 1.9.2 판매 중이면 가진 칸 뒤 모두 ＋ (누르면 사기 칸으로)
        for (var k = 0; k < need; k++) { var g = document.createElement(buy ? 'button' : 'i'); g.className = 'c ghost' + (buy ? ' add' : ''); if (buy) { g.type = 'button'; g.textContent = '＋'; g.setAttribute('data-slot-add', ''); g.title = tx('buy_more_slots'); } else g.title = tx('slot_not_available_yet'); c.appendChild(g); }
        var add = c.querySelector('.c.add'); if (add) c.appendChild(add);   // 줄 맨 끝 칸 = ＋ 추가 구매
      });
    };
    setTimeout(fill, 0);
    var t = 0; var onR = function () { clearTimeout(t); t = setTimeout(fill, 120); }; window.addEventListener('resize', onR);
    var mo = new MutationObserver(function () { if (!document.contains(ov)) { window.removeEventListener('resize', onR); mo.disconnect(); } }); mo.observe(document.body, { childList: true });
  }
  function slotBox() {
    var T = S.d.slots || {};
    if (!T.enabled) return;
    var tg = T.targets || [], cur = T.currencies || [];
    var mode = T.mode === 'monthly' ? tx('monthly_billing_auto_renew') : tx('buy_once_keep_forever');
    var html = ((T.usage || []).length ? '<div class="hal-gauges">' + T.usage.map(function (u) { return slotGauge(u, T.selling !== false); }).join('') + tx('free_slots_used_slots') + (T.selling === false && !T.exempt ? tx('not_on_sale_now') : '') + '</p></div>' : '') + (T.selling === false ? '<p class="hal-hint">' + (T.exempt ? tx('admins_are_exempt_from') : tx('sensor_slots_aren_t')) + '</p>' :   // 1.8.4
      tx('to_attach_more_sensors') + mode + tx('when_slots_expire_attached') +
      (tg.length > 1 ? tx('use_for') + tg.map(function (t) { return '<option value="' + esc(t.key) + '">' + esc(t.label) + '</option>'; }).join('') + '</select></label>' : '') +
      (cur.length ? cur.map(function (c) {
        return '<div class="hal-slotc"><div class="hal-slotc-h"><b>' + esc(c.label) + '</b><small>' + (c.balance != null ? tx('my_balance') + n(c.balance) : '') + (c.charge_url ? ' · <a href="' + esc(c.charge_url) + tx('data_go_top_up') : '') + '</small></div>' +
          '<div class="hal-slotc-b"><small class="hal-slot-price">' + c.prices.map(function (pr) { return pr.n + tx('s_7') + esc(pr.text) + (pr.n > 1 ? tx('per_item') + n(Math.round(pr.price / pr.n)) + ')' : ''); }).join(' · ') + '</small>' +   // 1.8.3 개수를 정해 사기
          '<span class="hal-slot-qty"><button type="button" class="hal-btn sm" data-qty-step="-1" data-cur="' + c.key + tx('aria_label_one_less') + (T.max_qty || 100) + '" value="1" data-slot-qty="' + c.key + tx('aria_label_quantity_to') + c.key + tx('aria_label_one_more') +
          '<button type="button" class="hal-btn pri" data-slot-buy="' + c.key + '">' + slotBtnText(c, 1) + '</button></div></div>';
      }).join('') : tx('no_payment_method_available'))) +
      ((T.slots || []).length ? tx('purchased_slots_2') + T.slots.map(function (x) {
        var st = x.status === 'active' ? (x.expires_at ? '🟢 ' + x.expires_at.slice(0, 10) + tx('until') : tx('active')) : x.status === 'cancelled' ? tx('cancelled') : tx('ended'), cx = x.cancel || {};
        return '<li' + (x.status === 'cancelled' ? ' class="off"' : '') + '><b>' + esc(x.for) + tx('sensors_3') + (x.size ? ' ' + x.size + tx('s_2') : '') + '</b><span>' + (x.status === 'cancelled' && /^0[^0-9]*$/.test(x.amount_text || '') ? '' : esc(x.amount_text) + ' · ') + st + '</span>' +   // 1.9.0 취소한 칸은 흐리게 (예전에 0개 · 0원으로 남은 것은 숫자 빼고)
          (x.mine && x.status === 'active' ? (cx.n > 0 ? '<button type="button" class="hal-btn sm" data-slot-cancel="' + x.id + '" data-max="' + cx.n + '" data-size="' + x.size + tx('title_cancel_up_to') + cx.n + tx('unused_slots_get_back') + (T.cancel_days || 0) + tx('days_of_purchase_cancel') : (cx.why ? tx('can_t_cancel') + esc(cx.why) + '</small>' : '')) : '') + (x.mode === 'monthly' && x.status === 'active' && x.mine ? '<label class="hal-chk"><input type="checkbox" data-slot-auto="' + x.id + '"' + (x.auto_renew ? ' checked' : '') + tx('auto_renew') : '') + '</li>';
      }).join('') + '</ul>' : '');
    var ov = modal(T.selling === false ? tx('purchased_sensor_slots') : tx('add_sensor_slots'), html);
    slotFill(ov);
    var curOf = function (k) { return cur.filter(function (c) { return c.key === k; })[0] || {}; };
    var qtyOf = function (k) { var i = ov.querySelector('[data-slot-qty="' + k + '"]'); var v = Math.round(+(i && i.value) || 1); return Math.max(1, Math.min(T.max_qty || 100, v)); };
    var redrawBtn = function (k) { var bb = ov.querySelector('[data-slot-buy="' + k + '"]'); if (bb) { bb.textContent = slotBtnText(curOf(k), qtyOf(k)); bb.disabled = slotTotal(curOf(k), qtyOf(k)) <= 0; } };
    ov.addEventListener('input', function (ev) { var i = ev.target.closest('[data-slot-qty]'); if (i) redrawBtn(i.getAttribute('data-slot-qty')); });
    ov.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-slot-add]')) { var qi = ov.querySelector('[data-slot-qty]'); if (qi) { qi.scrollIntoView({ block: 'center', behavior: 'smooth' }); qi.focus(); qi.select(); } return; }   // 1.8.6 ＋ 칸 추가
      var stp = ev.target.closest('[data-qty-step]');
      if (stp) { var k = stp.getAttribute('data-cur'), i = ov.querySelector('[data-slot-qty="' + k + '"]'); i.value = Math.max(1, Math.min(T.max_qty || 100, qtyOf(k) + +stp.getAttribute('data-qty-step'))); redrawBtn(k); return; }
      var cb = ev.target.closest('[data-slot-cancel]');
      if (cb) {   // 1.8.3 ↩️ 취소 — 여러 개면 몇 개를 취소할지
        var max = +cb.getAttribute('data-max'), size = +cb.getAttribute('data-size'), q = max;
        if (size > 1) { var a = prompt(tx('how_many_to_cancel') + max + tx('unused_slots'), String(max)); if (a == null) return; q = Math.round(+a); if (!(q >= 1 && q <= max)) { toast('1 ~ ' + max + tx('please_enter_a_number'), true); return; } }
        else if (!confirm(tx('cancel_1_sensor_slot'))) return;
        cb.disabled = true;
        api('POST', '/slots/' + cb.getAttribute('data-slot-cancel') + '/cancel', { n: q }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); ov.__close(); }).catch(function (e) { cb.disabled = false; fail(e); });
        return;
      }
      var b = ev.target.closest('[data-slot-buy]'); if (!b) return;
      var f = ov.querySelector('[data-slot-for]'), forv = f ? f.value : 'me', k2 = b.getAttribute('data-slot-buy'), c2 = curOf(k2), q2 = qtyOf(k2);
      if (!confirm((f ? f.options[f.selectedIndex].text + ' — ' : '') + slotBtnText(c2, q2).replace(tx('buy_2'), '· ') + tx('buy_it'))) return;
      b.disabled = true;
      api('POST', '/slots/buy', { currency: k2, n: q2, for: forv }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); ov.__close(); })
        .catch(function (e) {
          b.disabled = false;
          if (e.data && e.data.reason === 'insufficient' && c2.charge_url) {   // 1.8.3 모자라면 충전하러 갈지
            var need = slotTotal(c2, q2), have = c2.balance;
            if (confirm(e.message + (have != null ? tx('needed') + slotFmt(c2, need) + tx('my_balance_2') + slotFmt(c2, have) + ')' : '') + tx('go_top_up'))) { ov.__close(); go(c2.charge_url); }
            return;
          }
          fail(e);
        });
    });
    ov.addEventListener('change', function (ev) {
      var a = ev.target.closest('[data-slot-auto]'); if (!a) return;
      api('PUT', '/slots/' + a.getAttribute('data-slot-auto'), { auto_renew: a.checked }).then(function (r) { toast(r.message); S.d = r.data.overview; }).catch(function (e) { a.checked = !a.checked; fail(e); });
    });
  }
  /* 1.4.7 무한 스크롤 — 처음 PAGE 개 · 끝에 닿으면 PAGE 개씩 더 (분류 · 출처 · 모양을 바꾸면 처음부터) */
  var PAGE = 24;
  function moreBind() {
    if (S.io) { try { S.io.disconnect(); } catch (e) {} S.io = null; }
    var m = q('[data-more]'); if (!m) return;
    if (typeof IntersectionObserver === 'undefined') { m.outerHTML = tx('show_more'); var b = q('[data-more-btn]'); if (b) b.onclick = function () { S.lim = (S.lim || PAGE) + PAGE; redraw(); }; return; }
    S.io = new IntersectionObserver(function (es) { if (es[0] && es[0].isIntersecting) { S.io.disconnect(); S.lim = (S.lim || PAGE) + PAGE; redraw(); } }, { rootMargin: '600px' });
    S.io.observe(m);
  }
  /* 1.4.7 출처 — 🏠 Home Assistant · SmartThings · 1.10.0 🧩 Matter(3ds 연결) (카드의 배지와 같은 기준) */
  function srcOf(x) { return x.source === 'smartthings' || (x.sensors && x.sensors.length) ? 'st' : x.source === 'matter' ? 'mt' : x.source === 'mqtt' ? 'mq' : 'ha'; }   // 1.15.0 📨 MQTT
  function srcPick() { var v = pref('src', 'all'); return v === 'ha' || v === 'st' || v === 'mt' || v === 'mq' ? v : 'all'; }
  var MT_REPO = 'https://github.com/keidischoi/matter-3ds-link';   // 1.10.0 🧩 3ds Matter 연결 (라즈베리파이 · 리눅스 · 윈도우 python)
  /* 1.11.0 🪟 윈도우 한 줄 — PowerShell 만 (MprLink 와 같은 방식) · Matter 서버 주소는 이 브라우저에 기억 · 센서마다 사이트 기기는 연결 코드로 저절로 */
  function mtAddr() { return String(pref('mtaddr', '')).trim(); }
  function mtOs() { var v = pref('mtos', ''); if (v === 'win' || v === 'sh') return v; return /Win/i.test(navigator.platform || navigator.userAgent) ? 'win' : 'sh'; }   // 1.12.0 이 PC 에 맞게 먼저
  function mtLine(addr, os) {
    var L = S.d.link || {}, a = String(addr == null ? mtAddr() : addr).trim().replace(/[^A-Za-z0-9.:\[\]\/-]/g, ''), sh = (os || mtOs()) === 'sh';
    var u = (L.site || location.origin) + API + '/mt/' + (L.code || '') + (sh ? '.sh' : '.ps1') + (a ? '?matter=' + encodeURIComponent(a) : '');
    return sh ? 'curl -fsSL "' + u + '" | bash' : 'irm "' + u + '" | iex';
  }
  function mtWin(os) {
    os = os || mtOs();
    var sh = os === 'sh';
    return '<section class="hal-sec hal-mtwin" data-mtos="' + os + '"><h4>' + mtLogo() + tx('relay_install_one_line') +
      '<div class="hal-seg hal-mtos" role="tablist"><button type="button" role="tab" data-mt-os="win" class="' + (sh ? '' : 'on') + '" aria-selected="' + !sh + tx('windows_button_type_button') + (sh ? 'on' : '') + '" aria-selected="' + sh + tx('linux_mac_raspberry_pi') +
      tx('matter_server_address_for') + esc(mtAddr()) + tx('placeholder_e_g_192') +
      '<div class="hal-copy"><span>' + (sh ? tx('terminal') : 'PowerShell') + '</span><code data-mt-line>' + esc(mtLine(null, os)) + tx('copy_new') +
      '<ol class="hal-stc-steps"><li><em>1</em>' + (sh ? tx('open_a_terminal_ssh') : tx('start_open_powershell')) + tx('s_2_paste_and_press') +
      tx('on_an_always_on') + (sh ? tx('python3_standard_library_only') : '') + tx('the_line_contains_your');
  }
  function mtWinBind(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-mt-addr]'), function (inp) {
      inp.oninput = function () { setPref('mtaddr', inp.value.trim()); var box = inp.closest('.hal-mtwin'), c = box && box.querySelector('[data-mt-line]'); if (c) c.textContent = mtLine(inp.value, box.getAttribute('data-mtos')); };
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-mt-cp]'), function (b) { b.onclick = function () { var box = b.closest('.hal-mtwin'), inp = box && box.querySelector('[data-mt-addr]'); copy(mtLine(inp ? inp.value : null, box && box.getAttribute('data-mtos')), b); }; });
    Array.prototype.forEach.call(root.querySelectorAll('[data-mt-os]'), function (b) { b.onclick = function () { var os = b.getAttribute('data-mt-os'), box = b.closest('.hal-mtwin'); setPref('mtos', os); if (!box) return; var t = document.createElement('div'); t.innerHTML = mtWin(os); var nb = t.firstChild; box.parentNode.replaceChild(nb, box); mtWinBind(nb.parentNode); }; });   // 1.12.0 운영체제 고르기 (이 브라우저에 기억)
  }
  /* 1.12.0 Matter 로고 (공식 심볼 — 세 갈래). 그림 파일 없이 SVG 한 줄 · 색은 글자색을 따름(어두운 테마에서도 보이게). 상표는 Connectivity Standards Alliance 의 것 — 연결 대상 표시로만 씀
   *   심볼 모양 출처: Wikimedia Commons 「Logo of Matter connectivity standard.svg」 (퍼블릭 도메인 · 상표) — 글자 부분을 빼고 심볼만 */
  var MT_PATH = 'M65.715 32.905c-7.996 2.19-15.164 7.406-19.636 15.152s-5.407 16.568-3.306 24.587l7.835-4.526a23.9 23.9 0 0 1 1.105-11.836l18.309 10.569 4.303-2.487v-4.967L56.016 48.829a23.92 23.92 0 0 1 9.699-6.879zM8.607 32.905v9.045a23.91 23.91 0 0 1 9.699 6.879L0 59.398v4.967l4.303 2.487 18.306-10.569c1.39 3.868 1.726 7.938 1.108 11.836l7.832 4.526c2.101-8.02 1.167-16.841-3.306-24.587A32.52 32.52 0 0 0 8.607 32.905zM37.161 0l-4.303 2.484v21.138c-4.046-.731-7.736-2.476-10.804-4.961l-7.838 4.522c5.895 5.83 14 9.429 22.946 9.429s17.051-3.599 22.946-9.429l-7.835-4.522a23.92 23.92 0 0 1-10.807 4.961V2.484z';
  function mtLogo(cls) { return '<svg class="hal-stl hal-mtl' + (cls ? ' ' + cls : '') + '" viewBox="0 0 74.322 72.644" aria-hidden="true" focusable="false"><path fill="currentColor" d="' + MT_PATH + '"/></svg>'; }
  /* 1.5.0 🏢 내 기기 · 업체 기기 따로 — 업체 장비 · 업체 프린터에 붙인 기기는 업체 대표 · 관리자가 함께 고치고, 직원은 보기만 */
  function hasCo() { return !!((S.d.member_companies || []).length || (S.d.companies || []).length || S.d.devices.some(function (x) { return x.company_id; })); }
  function scope() { if (pref('scope', '') === 'map') return 'map'; if (!hasCo()) return 'all'; var v = pref('scope', ''); if (!v) { v = new URLSearchParams(location.search).get('scope') === 'company' ? 'company' : 'mine'; } return v === 'company' ? 'company' : v === 'all' ? 'all' : 'mine'; }   // 1.7.6 📡 전체
  /* 1.8.0 🏢 업체가 여럿이면 그 업체만 · 🏠 HA 서버가 여럿이면 그 서버만 (이 브라우저에 기억) */
  function coList() {
    var m = {}, out = [];
    (S.d.companies || []).concat(S.d.member_companies || []).forEach(function (c) { if (c && c.id && !m[c.id]) { m[c.id] = 1; out.push({ id: +c.id, name: c.name || tx('company') }); } });
    S.d.devices.forEach(function (x) { if (x.company_id && !m[x.company_id]) { m[x.company_id] = 1; out.push({ id: +x.company_id, name: tx('company_2') + x.company_id }); } });
    return out;
  }
  function coPick() { var v = +pref('co', 0) || 0; return v && coList().some(function (c) { return c.id === v; }) ? v : 0; }
  function haServers() {
    var m = {}, out = [];
    S.d.devices.forEach(function (x) { if (srcOf(x) !== 'ha') return; var k = x.ha_server || ''; if (!m[k]) { m[k] = { id: k, name: x.ha_server_name || (k ? 'Home Assistant' : tx('no_server_name_older')), n: 0 }; out.push(m[k]); } m[k].n++; });
    out.sort(function (a, b) { return (a.id === '') - (b.id === '') || b.n - a.n || a.name.localeCompare(b.name, 'ko'); });
    var seen = {}; out.forEach(function (x) { seen[x.name] = (seen[x.name] || 0) + 1; });   // 이름이 겹치면 「이름 #번호」
    out.forEach(function (x, i) { x.label = x.id && seen[x.name] > 1 ? x.name + ' #' + (i + 1) : x.name; });
    return out;
  }
  /* 1.8.1 🎨 받는 곳(HA 서버마다 · SmartThings)마다 색 · 짧은 표식 — 칩 · 카드 · 탭 · 대기 칸이 같은 색 (받는 곳이 둘 이상일 때만) */
  var SRV_COL = ['#f97316', '#a855f7', '#22c55e', '#e11d48', '#eab308', '#14b8a6', '#6366f1', '#db2777', '#84cc16', '#0891b2'];
  function recvs() {
    var out = haServers().map(function (v, i) { var nm = String(v.name || '').replace(/\s*(home\s*assistant|ha)\s*$/i, '').trim(); return { key: 'ha:' + v.id, col: SRV_COL[i % SRV_COL.length], short: v.id ? (nm ? nm.slice(0, 5) + (v.label !== v.name ? v.label.slice(v.name.length) : '') : 'HA' + (i + 1)) : tx('no_name'), label: v.label }; });
    if (S.d.devices.some(function (x) { return srcOf(x) === 'st'; })) out.unshift({ key: 'st', col: '#1d4ed8', short: 'ST', label: 'SmartThings' });
    if (S.d.devices.some(function (x) { return srcOf(x) === 'mt'; })) out.push({ key: 'mt', col: '#0f766e', short: 'Matter', label: tx('matter_3ds_link') });   // 1.10.0 🧩
    if (S.d.devices.some(function (x) { return srcOf(x) === 'mq'; })) out.push({ key: 'mq', col: '#7c3aed', short: 'MQTT·BT', label: tx('mqtt_bt_3ds_relay') });   // 1.15.0 📨
    return out;
  }
  function recvKey(x) { var s = srcOf(x); return s === 'ha' ? 'ha:' + (x.ha_server || '') : s; }
  function recvOf(x) { var k = recvKey(x); var r = recvs(); return r.length > 1 ? r.filter(function (v) { return v.key === k; })[0] || null : null; }
  function recvTag(x) { var r = recvOf(x); return r ? '<em class="hal-srvtag" style="--srv:' + r.col + '" title="' + esc(r.label) + tx('source') + esc(r.short) + '</em>' : ''; }
  function recvDot(key) { var r = recvs(); if (r.length < 2) return ''; var v = r.filter(function (y) { return y.key === key; })[0]; return v ? '<i class="hal-srvdot" style="--srv:' + v.col + '" aria-hidden="true"></i>' : ''; }
  function srvLabel(x) { var k = x.ha_server || ''; var s = haServers().filter(function (v) { return v.id === k; })[0]; return s ? s.label : 'Home Assistant'; }
  function srvPick() { var v = pref('hasrv', 'all'); return v === 'all' || !haServers().some(function (s) { return s.id === v; }) ? 'all' : v; }
  function inScope(x) { var sc = scope(), cp = coPick(); return (sc === 'all' || sc === 'map' || (sc === 'company' ? !!x.company_id : !x.company_id)) && (!cp || sc === 'mine' || !x.company_id || +x.company_id === cp); }
  function scopeBar() {
    var sc = scope(), nm = S.d.devices.filter(function (x) { return !x.company_id; }).length, nc = S.d.devices.length - nm;
    var mapTab = '<button type="button" role="tab" data-scope="map" class="' + (sc === 'map' ? 'on' : '') + tx('title_source_device_attached');   // 1.7.0
    if (!hasCo()) return tx('button_type_button_role') + (sc !== 'map' ? 'on' : '') + tx('devices') + S.d.devices.length + '</small></button>' + mapTab + '</div>';
    return tx('button_type_button_role_2') + (sc === 'all' ? 'on' : '') + tx('all') + S.d.devices.length + '</small></button><button type="button" role="tab" data-scope="mine" class="' + (sc === 'mine' ? 'on' : '') + tx('my_devices') + nm + '</small></button>' +
      '<button type="button" role="tab" data-scope="company" class="' + (sc === 'company' ? 'on' : '') + tx('company_devices') + nc + '</small></button>' + mapTab + '</div>' +
      (sc !== 'mine' && sc !== 'map' && coList().length > 1 ? tx('s_8') + [{ id: 0, name: tx('all_companies') }].concat(coList()).map(function (c) { var on = coPick() === c.id, n = c.id ? S.d.devices.filter(function (x) { return +x.company_id === c.id; }).length : nc; return '<button type="button" role="tab" data-co="' + c.id + '" class="' + (on ? 'on' : '') + '" aria-selected="' + on + '"><i aria-hidden="true">🏢</i>' + esc(c.name) + '<em>' + n + '</em></button>'; }).join('') + '</div>' : '') +   // 1.8.0
      (sc === 'company' ? tx('devices_attached_to_company') : '');
  }
  function shown() { var sp = srcPick(), sv = srvPick(); return S.d.devices.filter(function (x) { return inScope(x) && (sp === 'all' || srcOf(x) === sp) && (sv === 'all' || (srcOf(x) === 'ha' && (x.ha_server || '') === sv)); }); }
  function tools() {
    var d = S.d, gf = pref('gf', 'all'), vw = pref('view', 'card'), cnt = {}, sp = srcPick(), sc = { ha: 0, st: 0, mt: 0, mq: 0 };
    d.devices.forEach(function (x) { sc[srcOf(x)]++; });
    var srcRow = (!!sc.ha + !!sc.st + !!sc.mt + !!sc.mq) > 1 || sp !== 'all' ? tx('s_9') + [['all', '📡', tx('all_sources'), d.devices.length], ['ha', haLogo(), 'Home Assistant', sc.ha], ['st', stLogo(), 'SmartThings', sc.st], ['mt', mtLogo(), 'Matter', sc.mt], ['mq', mqLogo(), 'MQTT · BT', sc.mq]].filter(function (c) { return (c[0] !== 'mt' && c[0] !== 'mq') || c[3] || sp === c[0]; }).map(function (c) { return '<button type="button" role="tab" data-src="' + c[0] + '" class="' + (sp === c[0] ? 'on' : '') + '" aria-selected="' + (sp === c[0]) + '"><i aria-hidden="true">' + c[1] + '</i>' + c[2] + '<em>' + c[3] + '</em></button>'; }).join('') + '</div>' : '';
    shown().forEach(function (x) { cnt[x.group || 'none'] = (cnt[x.group || 'none'] || 0) + 1; });
    var chips = [['all', '📡', tx('all_2'), shown().length]].concat(groups().filter(function (g) { return cnt[g[0]]; }).map(function (g) { return [g[0], g[1], g[2], cnt[g[0]]]; }));
    var svs = haServers(), sv = srvPick();   // 1.8.0 🏠 HA 서버가 둘 이상이면 서버마다
    if (svs.length > 1) srcRow += tx('s_10') + [{ id: 'all', name: tx('all_ha_servers'), n: sc.ha }].concat(svs).map(function (s) { var on = sv === s.id; return '<button type="button" role="tab" data-hasrv="' + esc(s.id) + '" class="' + (on ? 'on' : '') + '" aria-selected="' + on + '"><i aria-hidden="true">' + (s.id === 'all' ? haLogo() : '🏠') + '</i>' + (s.id === 'all' ? '' : recvDot('ha:' + s.id)) + esc(s.label || s.name) + '<em>' + s.n + '</em></button>'; }).join('') + '</div>';
    if (vw === 'board') { srcRow = ''; chips = []; }   // 1.6.0 보드는 붙일 곳 모두를 한 판에
    return '<div class="hal-tools">' + srcRow + tx('s_11') + chips.map(function (c) { return '<button type="button" role="tab" data-gf="' + c[0] + '" class="' + (gf === c[0] ? 'on' : '') + '" aria-selected="' + (gf === c[0]) + '"><i aria-hidden="true">' + c[1] + '</i>' + esc(c[2]) + '<em>' + c[3] + '</em></button>'; }).join('') + '</div>' +
      tx('s_12') + VIEWS.map(function (v) { return '<button type="button" data-view="' + v[0] + '" class="' + (vw === v[0] ? 'on' : '') + '" aria-pressed="' + (vw === v[0]) + '" title="' + v[2] + tx('view') + v[1] + '</i>' + v[2] + '</button>'; }).join('') + '</div></div>';
  }
  function grpFold(k) { try { return localStorage.getItem('hal:grp:' + k) === '0'; } catch (e) { return false; } }
  /* 1.4.7 업체 한도 — 「/ 50 (업체 전체 12)」 */
  function coLimit(k) {
    if (k.charAt(0) !== 'c' || !S.d.limits) return '';
    var c = (S.d.limits.companies || []).filter(function (x) { return 'c' + x.id === k; })[0];
    return c && c.max > 0 ? '<small class="hal-lim' + (c.used >= c.max ? ' full' : '') + tx('title_devices_allowed_per') + c.used + tx('company_3') + c.used + ' / ' + c.max + '</small>' : '';
  }
  /* 1.17.3 묶음 거르기 — [단추 글, 뜻, 거르는 함수] · 고른 것은 S.gfil[묶음] (새로 그려도 그대로) */
  var GFIL = {
    all: [tx('all_2'), tx('all_3'), function () { return true; }],
    live: [tx('connected'), tx('connected_2'), function (x) { return !x.stale && !x.never; }],
    off: [tx('disconnected_2'), tx('disconnected_3'), function (x) { return x.stale && !x.never; }],
    hot: [tx('over_2'), tx('over_threshold_2'), function (x) { return !!x.over; }],
    wait: [tx('waiting'), tx('waiting_for_values_2'), function (x) { return !!x.never; }]
  };
  /* 1.17.3 정렬 — [이름, 비교] · 이 브라우저에 기억 (hal:sort) · 값이 없는 것은 뒤로 */
  var nameCmp = function (a, b) { return String(a.name).localeCompare(String(b.name), 'ko', { numeric: true }); };
  var num = function (v) { return v == null ? -Infinity : +v; };
  var GSORT = {
    name: [tx('name'), nameCmp],
    recent: [tx('recent_activity'), function (a, b) { return String(b.seen || '').localeCompare(String(a.seen || '')) || nameCmp(a, b); }],
    hum: [tx('highest_humidity'), function (a, b) { return num(b.humidity) - num(a.humidity) || nameCmp(a, b); }],
    temp: [tx('highest_temperature'), function (a, b) { return num(b.temp) - num(a.temp) || nameCmp(a, b); }],
    issue: [tx('problems_first'), function (a, b) { var r = function (x) { return x.over ? 0 : x.stale && !x.never ? 1 : x.never ? 2 : 3; }; return r(a) - r(b) || nameCmp(a, b); }],
    added: [tx('order_added'), function (a, b) { return a.id - b.id; }]
  };
  function sortSel() { var cur = GSORT[pref('sort', 'added')] ? pref('sort', 'added') : 'added'; return tx('s_13') + Object.keys(GSORT).map(function (k) { return '<option value="' + k + '"' + (cur === k ? ' selected' : '') + '>↕ ' + GSORT[k][0] + '</option>'; }).join('') + '</select>'; }
  function grouped() {
    var d = S.d, gf = pref('gf', 'all'), vw = pref('view', 'card'), devs = shown(), left = S.lim || PAGE;   // 1.4.7 출처로 거름 · 스크롤하면 더 (PAGE 개씩)
    if (gf !== 'all' && !devs.some(function (x) { return (x.group || 'none') === gf; })) gf = 'all';   // 고른 분류가 비면 전체
    var cut = false, html = groups().filter(function (g) { return gf === 'all' || g[0] === gf; }).map(function (g) {
      var all = devs.filter(function (x) { return (x.group || 'none') === g[0]; });
      if (!all.length || left <= 0) { if (all.length) cut = true; return ''; }
      // 1.17.3 묶음마다 거르기 — 제목 옆 빈자리에 「전체 · 🟢 연결됨 · 📴 끊김 · ⚠️ 기준 넘음 · ⏳ 기다림」 (있는 것만 · 다시 누르면 전체)
      var fk = (S.gfil && S.gfil[g[0]]) || 'all', cnt = {}; Object.keys(GFIL).forEach(function (k) { cnt[k] = all.filter(GFIL[k][2]).length; });
      if (!cnt[fk]) fk = 'all';
      var list = all.filter(GFIL[fk][2]).sort((GSORT[pref('sort', 'added')] || GSORT.added)[1]);
      var open = gf !== 'all' || !grpFold(g[0]), part = open ? list.slice(0, left) : [];   // 접힌 묶음은 카드를 그리지 않음
      if (open) { left -= part.length; if (part.length < list.length) cut = true; }
      var chips = Object.keys(GFIL).map(function (k) { var z = k !== 'all' && !cnt[k]; return '<button type="button" class="hal-gfil k-' + k + (fk === k ? ' on' : '') + (z ? ' zero' : '') + '" data-gfil="' + g[0] + '|' + k + '" aria-pressed="' + (fk === k) + '"' + (z ? ' disabled' : '') + ' title="' + (z ? GFIL[k][1] + tx('none') : GFIL[k][1] + tx('only')) + '">' + GFIL[k][0] + '<em>' + cnt[k] + '</em></button>'; }).join('');   // 1.17.5 늘 다섯 개 (0개는 흐리게 · 안 눌림)
      return '<details class="hal-grp g-' + (g[0].charAt(0) === 'c' ? 'co' : g[0]) + '" data-grp="' + g[0] + '"' + (gf !== 'all' || !grpFold(g[0]) ? ' open' : '') + '><summary><i aria-hidden="true">' + g[1] + '</i><b>' + esc(g[2]) + '</b><small>' + esc(g[3]) + '</small>' +
        '<span class="hal-gfils" role="group" aria-label="' + esc(g[2]) + tx('filter') + chips + coLimit(g[0]) + '</span>' + sortSel() + '</summary><div class="hal-grid hal-v-' + vw + '">' + (part.length ? part.map(card).join('') : tx('no_devices_match_these')) + '</div></details>';
    }).join('');
    return html + (cut ? tx('s_14') : '');
  }
  function selBar() {
    var d = S.d, n = Object.keys(S.sel).length, stale = d.devices.filter(function (x) { return x.stale; }).length;
    return '<div class="hal-selbar"><label><input type="checkbox" data-sel-all' + (n && n === d.devices.length ? ' checked' : '') + tx('all_4') +
      (stale ? tx('disconnected_only') + stale + ')</button>' : '') +
      '<span>' + n + tx('selected_select_class_hal') + (n ? '' : ' disabled') + tx('aria_label_move_selected') + grpOpts('', '') + tx('auto_follows_attached_place_2') + (n ? '' : ' disabled') + '>🗑 ' + n + tx('delete_cancel');
  }
  /* 1.6.0 📦 보관함 보드 — 센서 칩을 보관함 · 내 프린터 · 업체 장비에 끌어다 붙이기 (휴대폰은 칩을 누르고 → 놓을 곳을 누름)
     보관함은 🌡️ 하나 · 💧 하나 / 장비는 ⚙️ 상태 센서가 재는 챔버 온습도가 먼저 — 빠진 것만 일반 센서로 (겹치면 바꿔 끼우고 예전 것은 대기 칸) */
  var INV = '/api/modules/custom-inventory/me/drawer/boxes';
  function bkey(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }
  var BOX_COL = ['#d97706', '#0d9488', '#65a30d', '#e11d48', '#0284c7', '#c026d3', '#ea580c', '#059669', '#4338ca', '#a16207'];   // 재고 관리 보관함 색판과 같음
  function boxCol(b) { if (/^#[0-9a-f]{3,8}$/i.test(b.color || '')) return b.color; var k = b.key || bkey(b.name), h = 0; for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0; return BOX_COL[Math.abs(h) % BOX_COL.length]; }
  /** 재고 관리 보관함 모양 그대로 — 색 뚜껑 · 투명한 통 안의 롤(필라멘트 색 · 남은 만큼) · 옆면 온습도계 · 앞면 이름표 */
  /* 1.9.0 🔔 알림 구간 — 「40~60%」 · 「60% 넘으면」 · 「30% 밑이면」 */
  function rangeText(min, max, u) { return min != null && max != null ? min + '~' + max + u : max != null ? max + u + tx('above') : min != null ? min + u + tx('below') : tx('no_alert'); }
  function rangeWarn(hu, st) {
    var w = [];
    if (hu && hu.over && hu.humidity != null) w.push(tx('humidity') + hu.humidity + '% ' + (hu.humidity_min != null && hu.humidity < hu.humidity_min ? tx('low') : tx('high')));
    if (st && st.over && st.temp != null) w.push(tx('temp') + st.temp + '° ' + (st.temp_min != null && st.temp < st.temp_min ? tx('low') : tx('high')));
    return w.join(' · ') || tx('out_of_range');
  }
  /** 1.9.0 🔔 보관함에서 바로 — 습도 센서 · 온도 센서의 알림 구간 (아래 · 위, 비우면 그쪽은 안 봄) */
  function rangeBox(hu, st) {
    var row = function (x, k, u, lbl, presets) {
      if (!x) return '<p class="hal-hint">' + lbl + tx('sensor');
      var mn = x[k + '_min'], mx = x[k + '_max'], ro = x.perm === 'view';
      return '<fieldset class="hal-rng-f"' + (ro ? ' disabled' : '') + '><legend>' + lbl + ' — ' + esc(x.name) + (ro ? tx('view_only') : '') + '</legend>' +
        '<div class="hal-rng-in"><input type="number" data-r="' + k + '_min" value="' + (mn == null ? '' : mn) + tx('placeholder_no_minimum_input') + k + '_max" value="' + (mx == null ? '' : mx) + tx('placeholder_no_maximum') + u + '</b></div>' +
        (presets ? '<div class="hal-chips">' + presets.map(function (p) { return '<button type="button" class="hal-chip" data-pre="' + k + '" data-a="' + (p[0] == null ? '' : p[0]) + '" data-b="' + (p[1] == null ? '' : p[1]) + '">' + p[2] + '</button>'; }).join('') + '</div>' : '') + '</fieldset>';
    };
    var html = tx('alerts_when_the_value') +
      row(hu, 'humidity', '%', tx('humidity_2'), [[null, 20, tx('dry_20')], [null, 40, '~40%'], [30, 50, '30~50%'], [40, 60, '40~60%'], [null, null, tx('alerts_off')]]) +
      row(st, 'temp', '°C', tx('temperature'), [[null, 30, '~30°C'], [10, 35, '10~35°C'], [null, null, tx('alerts_off')]]);
    var ov = modal(tx('alert_range'), html, { ok: tx('save'), onSave: function (o) {
      var val = function (k) { var i = o.querySelector('[data-r="' + k + '"]'); return i ? (i.value.trim() === '' ? null : +i.value) : undefined; };
      var bad = function (a, b) { return a != null && b != null && a >= b; };
      if (bad(val('humidity_min'), val('humidity_max')) || bad(val('temp_min'), val('temp_max'))) { toast(tx('the_lower_value_must'), true); return Promise.reject(new Error('')); }
      var jobs = [], same = hu && st && hu.id === st.id;
      if (hu && hu.perm !== 'view') jobs.push([hu.id, same ? { humidity_min: val('humidity_min'), humidity_max: val('humidity_max'), temp_min: val('temp_min'), temp_max: val('temp_max') } : { humidity_min: val('humidity_min'), humidity_max: val('humidity_max') }]);
      if (st && st.perm !== 'view' && !same) jobs.push([st.id, { temp_min: val('temp_min'), temp_max: val('temp_max') }]);
      var last = null;
      return jobs.reduce(function (p, j) { return p.then(function () { return api('POST', '/devices/' + j[0] + '/range', j[1]).then(function (r) { last = r; toast(r.message); }); }); }, Promise.resolve())
        .then(function () { if (last && last.data) { S.d = last.data.overview; draw(); } });
    } });
    ov.addEventListener('click', function (ev) { var p = ev.target.closest('[data-pre]'); if (!p) return; var k = p.getAttribute('data-pre'); ov.querySelector('[data-r="' + k + '_min"]').value = p.getAttribute('data-a'); ov.querySelector('[data-r="' + k + '_max"]').value = p.getAttribute('data-b'); });
  }
  function binZone(b, devs, acts) {
    var rl = b.reels || [], n = Math.min(b.rolls || rl.length, 10), cols = n <= 4 ? Math.max(1, n) : Math.ceil(n / 2), rows = n <= 4 ? 1 : 2, more = (b.rolls || 0) - rl.length;
    var st = devs.filter(function (x) { return capsOf(x).temp; })[0], hu = devs.filter(function (x) { return capsOf(x).hum; })[0], hot = (hu && hu.over) || (st && st.over);   // 1.9.0 구간 밖 (위 · 아래)
    var reels = rl.map(function (x, i) { var w = +x.w || 1000, sz = w <= 250 ? 22 : w <= 500 ? 26 : w < 2000 ? 30 : 34, last = more > 0 && i === rl.length - 1;
      return '<i class="reel' + (x.b ? ' bottle' : '') + (x.s ? ' sealed' : '') + (last ? ' more' : '') + '" style="--sz:' + sz + 'px;--c:' + (/^#[0-9a-f]{3,8}$/i.test(x.c || '') ? x.c : '#94a3b8') + ';--p:' + (+x.p || 0) + '"' + ' title="' + (last ? (more + 1) + tx('more_see_all_in') : esc((x.n || (x.b ? tx('resin') : tx('filament'))) + tx('left_3') + (+x.p || 0) + '%' + (x.s ? tx('new_unopened_roll') : ''))) + '"' + '>' + (last ? '<b>+' + (more + 1) + '</b>' : '') + '</i>'; }).join('');
    var gauge = '<span class="gauge' + (hu || st ? ' rng' : '') + '"' + (hu || st ? ' data-rng-h="' + (hu ? hu.id : '') + '" data-rng-t="' + (st ? st.id : '') + '" role="button"' : '') + tx('title_click_to_set') + (st ? esc(st.name) : tx('no_temperature_sensor')) + ' · 💧 ' + (hu ? esc(hu.name) : tx('no_humidity_sensor')) + '">💧' + (hu ? (hu.humidity == null ? '–' : hu.humidity) + '%' : tx('empty')) + ' 🌡️' + (st ? (st.temp == null ? '–' : st.temp) + '°' : tx('empty')) + '</span>';
    return '<div class="hal-bd hal-bin' + (b.loose ? ' loose' : '') + (hot ? ' hot' : '') + '" data-drop="location" data-loc="' + esc(b.name) + '" data-ref="' + (+(b.company_id || 0)) + '"' + (b.drag != null ? ' data-mv-name="' + esc(b.name) + '" data-mv-from="' + b.drag + tx('title_drag_onto_the') : '') + ' style="--bx:' + (b.loose ? '#94a3b8' : boxCol(b)) + ';--cols:' + Math.max(cols, 4) + ';--rows:' + rows + '">' +
      '<span class="lid"></span><span class="body">' + gauge + (reels || '<em>' + (b.loose ? tx('location_not_in_inventory') : b.seen ? tx('inventory_storage_box') : tx('empty_2')) + '</em>') + '</span>' +
      '<span class="tag"><b title="' + esc(b.name) + '">📦 ' + esc(b.name) + '</b><small>' + (b.loose ? tx('sensor_only') : b.seen ? tx('storage_location') : (b.rolls || 0) + tx('s_2')) + (hot ? ' · ⚠️ ' + rangeWarn(hu, st) : '') + '</small><span class="acts">' + acts + '</span></span>' +
      (b.company ? '<small class="hal-bin-co">🏢 ' + esc(b.company) + '</small>' : '') +
      '<div class="hal-chips">' + (devs.length ? devs.map(function (x) { return chip(x, true); }).join('') : tx('drop_a_sensor_here')) + '</div></div>';
  }
  function capsOf(x) { return x.caps || { state: !!x.entities.state, temp: !!x.entities.temp, hum: !!x.entities.hum }; }
  function chip(x, bare) {   // bare — 보관함 안: 온습도는 위 온습도계에 있으니 이름만
    var c = capsOf(x), v = [];
    if (c.temp && x.temp != null) v.push(x.temp + '°'); if (c.hum && x.humidity != null) v.push(x.humidity + '%');
    var rv = recvOf(x);   // 1.8.1 🎨 받는 곳 색 띠 · 표식
    return '<button type="button" class="hal-chip' + (rv ? ' srv' : '') + (S.pick === x.id ? ' on' : '') + (x.stale ? ' off' : '') + (x.perm === 'view' ? ' ro' : '') + '"' + (rv ? ' style="--srv:' + rv.col + '"' : '') + (x.perm === 'view' ? '' : ' draggable="true"') + ' data-chip="' + x.id + '" title="' + (x.perm === 'view' ? tx('only_the_company_s') : tx('drag_and_drop_or')) + '">' +
      (bare ? '' : '<i aria-hidden="true">' + (c.state ? '⚙️' : '') + (c.temp ? '🌡️' : '') + (c.hum ? '💧' : '') + '</i>') + '<b>' + esc(x.name) + '</b>' + (!bare && v.length ? '<small>' + v.join(' · ') + '</small>' : '') + recvTag(x) + '</button>';
  }
  /** 칸 — 상태 센서(장비 값)가 먼저, 없으면 일반 센서 */
  function slotRow(devs, kinds) {
    var st = devs.filter(function (x) { return capsOf(x).state; }), gen = devs.filter(function (x) { return !capsOf(x).state; });
    var K = { state: ['⚙️', tx('status')], temp: ['🌡️', tx('temperature_2')], hum: ['💧', tx('humidity_3')] };
    return '<div class="hal-slots">' + kinds.map(function (k) {
      var x = st.concat(gen).filter(function (o) { return capsOf(o)[k]; })[0];
      var val = !x ? '' : k === 'state' ? (x.is_on ? tx('running') : tx('idle')) : k === 'temp' ? (x.temp == null ? '–' : x.temp + '°C') : (x.humidity == null ? '–' : x.humidity + '%');
      return '<span class="hal-slot' + (x ? ' full' : '') + '" title="' + K[k][1] + (x ? ' — ' + esc(x.name) + (capsOf(x).state && k !== 'state' ? tx('equipment_value') : '') : tx('empty_3')) + '"><i aria-hidden="true">' + K[k][0] + '</i>' + (x ? '<b>' + esc(val) + '</b>' : tx('empty_4')) + '</span>';
    }).join('') + '</div>';
  }
  function zone(cls, attrs, head, devs, kinds) {
    return '<div class="hal-bd ' + cls + '" ' + attrs + '><header>' + head + '</header>' + slotRow(devs, kinds) + '<div class="hal-chips">' + (devs.length ? devs.map(chip).join('') : tx('drag_here')) + '</div></div>';
  }
  /** 1.7.5 🖨️ 프린터 모양 — 틀 · 위 레일과 노즐(출력 중이면 움직임) · 창 안의 프린터 사진 · 베드 · 다리 · 앞면 이름판 · 위 계기판(⚙️ · 🌡️ · 💧)
      1.7.6 🏭 업체 장비도 같은 틀로 — 종류마다 모양: 3D 프린터 · 작업대(레이저 · CNC · UV · 플로터 · 진공 성형) · 함(건조기 · 세척 · 경화) · 패널(그 밖) */
  var EQ_SHAPE = { laser: ['flat', '🔴'], cnc: ['flat', '🪚'], uv_print: ['flat', '🖌️'], plotter: ['flat', '✂️'], vacuum: ['flat', '🫧'], dryer: ['box', '🌀'], wash_cure: ['box', '💡'],
    scanner: ['cab', '📷'], post: ['cab', '🎨'], injection: ['cab', '💉'], measure: ['cab', '📏'], other: ['cab', '🏭'] };
  function machine(o, devs) {
    var sd = devs.filter(function (x) { return capsOf(x).state; }), all = sd.concat(devs.filter(function (x) { return !capsOf(x).state; }));
    var pick = function (k) { return all.filter(function (q) { return capsOf(q)[k]; })[0]; }, st = pick('state'), te = pick('temp'), hu = pick('hum');
    var run = !!o.run || !!(st && st.is_on), on = !!o.live || devs.some(function (x) { return !x.stale && !x.never; }) || (o.eq && !devs.length);   // 장비는 센서가 없으면 끊긴 게 아님
    var stTxt = st ? (st.is_on ? tx('running') : tx('idle')) : o.stTxt || '';
    var gauge = '<span class="gauge">⚙️' + (stTxt ? esc(stTxt) : tx('empty')) + ' 🌡️' + (te ? (te.temp == null ? '–' : te.temp) + '°' : tx('empty')) + ' 💧' + (hu ? (hu.humidity == null ? '–' : hu.humidity) + '%' : tx('empty')) + '</span>';
    return '<div class="hal-bd hal-prn s-' + o.shape + (o.eq ? ' eq k-' + esc(o.kind || 'other') : '') + (run ? ' run' : '') + (on ? '' : ' gone') + (o.fail ? ' fail' : '') + '" data-drop="' + o.drop + '" data-ref="' + o.ref + '" title="' + esc(o.name + (o.sub ? ' · ' + o.sub : '') + (stTxt ? ' · ' + stTxt : '') + (o.seen ? ' · ' + agoText(o.seen) : '') + (on ? '' : tx('link_off'))) + '">' +
      '<span class="frame">' + gauge + '<span class="rail"><i class="head"></i></span><span class="win">' + (o.img && o.img.charAt(0) === '<' ? o.img : '<em>' + o.icon + '</em>') + '</span><span class="bed"></span></span><span class="feet"><i></i><i></i></span>' +
      '<span class="tag"><b>' + o.icon + ' ' + esc(o.name) + '</b><small>' + esc(o.note || (o.eq && !devs.length ? tx('no_sensor') : on ? (stTxt || tx('connected_3')) : tx('link_off_2'))) + '</small></span>' +
      (o.co ? '<small class="hal-bin-co">🏢 ' + esc(o.co) + (o.sub ? ' · ' + esc(o.sub) : '') + '</small>' : '') +
      '<div class="hal-chips">' + (devs.length ? devs.map(function (x) { return chip(x, true); }).join('') : tx('drop_a_sensor_here')) + '</div></div>';
  }
  function prnZone(p, devs, e) {   // 1.7.9 e = 이어진 업체 장비 (프린터 라운지 「재고 장비로도」) — 하나로 보임
    var PS = { printing: tx('printing'), paused: tx('paused'), done: tx('finished'), failed: tx('failed'), idle: tx('idle') }, bad = e && e.status && e.status !== 'ok' && e.status !== 'busy';
    return machine({ shape: 'printer', drop: 'printer', ref: p.id, name: p.name, icon: '🖨️', img: prIcon(p), run: p.state === 'printing', live: p.live, stTxt: PS[p.state] || '', seen: p.seen, fail: p.state === 'failed' || bad,
      note: bad ? (e.status_emoji || '⚠️') + ' ' + (e.status_label || e.status) : '', sub: e ? tx('linked_to_company_equipment') : '' }, devs);
  }
  function eqZone(e, devs, co) {
    var sh = e.is_printer ? ['printer', e.kind === 'fdm' ? '🖨️' : '🧪'] : EQ_SHAPE[e.kind] || EQ_SHAPE.other, bad = e.status && e.status !== 'ok' && e.status !== 'busy';
    return machine({ shape: sh[0], eq: true, kind: e.kind, drop: 'equipment', ref: e.id, name: e.name, icon: sh[1], co: co, sub: e.kind_label, run: e.status === 'busy', live: false,
      note: bad ? (e.status_emoji || '⚠️') + ' ' + (e.status_label || e.status) : '', fail: bad }, devs);
  }
  /* 1.7.6 보드도 탭 따라 — 👤 내 기기(개인 보관함 · 내 프린터) · 🏢 업체 기기(업체마다 보관함 · 업체 프린터 · 장비) · 📡 전체(둘 다)
     1.7.8 주인마다 나누면 멀어서 끌기 힘듦 → 종류(보관함 · 프린터 · 장비)마다 한 줄에 같이 늘어놓고 ‹ › 단추로 좌우로 · 개인 · 업체는 배지로 */
  function strip(html, key) {
    return '<div class="hal-strip-w" data-strip="' + key + tx('s_15') + html + tx('s_16');
  }
  function badged(html, b) { return b ? html.replace(/^(<div [^>]*>)/, '$1' + b) : html; }
  function board() {
    var d = S.d, sc = scope(), cos = {}, owners = [];
    (d.companies || []).forEach(function (c) { cos[c.id] = c.name; });
    var placed = function (x) { return x.target !== 'other' && !!x.where; };
    var free = d.devices.filter(function (x) { return !placed(x); });
    /* 1.8.0 📡 대기 칸을 받는 곳마다 — 🏠 HA 서버 이름(겹치면 #번호) · SmartThings · 1.10.0 🧩 Matter (하나뿐이면 예전처럼 한 줄) */
    var freeHtml = function (xs) {
      var g = {}, keys = [];
      xs.forEach(function (x) { var k = recvKey(x); if (!g[k]) { g[k] = []; keys.push(k); } g[k].push(x); });
      if (keys.length < 2) return xs.map(chip).join('');
      return keys.map(function (k) { return '<div class="hal-freegrp" style="--srv:' + ((recvs().filter(function (v) { return v.key === k; })[0] || {}).col || 'transparent') + '"><small class="hal-freegrp-t">' + recvDot(k) + (k === 'st' ? stLogo() + ' SmartThings' : k === 'mt' ? mtLogo() + ' Matter' : k === 'mq' ? mqLogo() + ' MQTT · BT' : '🏠 ' + esc(srvLabel(g[k][0]))) + ' · ' + g[k].length + '</small>' + g[k].map(chip).join('') + '</div>'; }).join('');
    };   // 1.7.18 대기 칸은 탭과 상관없이 모두 (어느 쪽으로든 끌어 붙이게)
    var at = function (fn) { return d.devices.filter(function (x) { return placed(x) && fn(x); }); };
    var cidOf = function (v) { return +(v || 0); };
    if (sc !== 'company') owners.push(0);
    var coName = Object.assign({}, cos);   // 1.7.17 재고 관리 서랍과 같은 범위 — 직원인 업체의 보관함도 (보기 · 붙이기는 대표 · 관리자만)
    (d.boxes || []).forEach(function (b) { if (cidOf(b.company_id) && coName[b.company_id] == null) coName[b.company_id] = b.company || tx('company'); });
    if (sc !== 'mine') Object.keys(coName).forEach(function (k) { if (!coPick() || +k === coPick()) owners.push(+k); });   // 1.8.0 고른 업체만
    var multi = owners.length > 1, linked = {};
    (d.printers || []).forEach(function (p) { if (p.equipment_id) linked[p.equipment_id] = p.id; });   // 1.7.9 업체 프린터 = 업체 장비 (이어진 것은 하나로)
    var badge = function (cid) { return cid ? tx('s_17') + esc(coName[cid] || tx('company')) + '</span>' : multi ? tx('personal_2') : ''; };
    var boxHtml = '', prHtml = '', eqHtml = '';
    owners.forEach(function (cid) {
      var boxes = [], have = {};
      (d.boxes || []).forEach(function (b) {   // 1.6.2 이름이 같으면 한 보관함으로 — 주인(개인 · 업체)마다 따로
        if (cidOf(b.company_id) !== cid) return;
        var k = bkey(b.name), o = have[k];
        if (!o) { o = have[k] = Object.assign({}, b, { reels: (b.reels || []).slice() }); boxes.push(o); return; }
        o.rolls = (o.rolls || 0) + (b.rolls || 0); o.reels = o.reels.concat(b.reels || []).slice(0, 10);
      });
      if (!cid && !(d.boxes || []).length) (d.locations || []).forEach(function (l) { if (l && !have[bkey(l)]) { have[bkey(l)] = 1; boxes.push({ name: l, key: bkey(l), rolls: 0, record: false, reels: [], seen: true }); } });   // 1.6.1 재고 관리가 아직 보관함을 안 알려 주면 위치 이름만으로
      d.devices.forEach(function (x) { if (x.target === 'location' && x.location && cidOf(x.company_id) === cid && !have[bkey(x.location)]) { have[bkey(x.location)] = 1; boxes.push({ name: x.location, company_id: cid, rolls: 0, record: false, loose: true }); } });   // 재고 관리에 없는 보관 위치
      boxHtml += boxes.map(function (b) {
        var on = at(function (x) { return x.target === 'location' && bkey(x.location) === bkey(b.name) && cidOf(x.company_id) === cid; });
        // 1.7.12 ⇄ 개인 ↔ 업체로 통째로 옮기기 (재고 관리 0.3.83+) — 이름판을 끌어 위 👤 · 🏢 탭에 놓아도
        var mv = d.config.inventory && !b.seen && !b.loose && Object.keys(cos).length ? '<button type="button" class="hal-icobtn" data-box-act="move" data-name="' + esc(b.name) + '" data-from="' + cid + '" title="' + (cid ? tx('move_to_personal_another') : tx('move_to_company')) + tx('with_filament_sensors_aria') : '';
        if (mv) b.drag = cid;
        if (b.seen || cid) return badged(binZone(b, on, mv), badge(cid));   // 롤 수를 모르거나 🏢 업체 보관함 — 이름 바꾸기 · 지우기는 재고 관리에서
        var acts = d.config.inventory && !b.loose ? '<button type="button" class="hal-icobtn" data-box-act="rename" data-name="' + esc(b.name) + tx('title_rename_aria_label') : '';
        acts += '<button type="button" class="hal-icobtn" data-box-act="del" data-name="' + esc(b.name) + '" data-rolls="' + (b.all != null ? b.all : b.rolls || 0) + '" data-loose="' + (b.loose ? 1 : 0) + '" title="' + (b.loose ? tx('sensors_to_waiting_area') : tx('delete_storage_box')) + tx('aria_label_delete');
        return badged(binZone(b, on, mv + acts), badge(cid));
      }).join('');
      prHtml += (d.printers || []).filter(function (p) { return cidOf(p.company_id) === cid; }).map(function (p) {
        var e = p.equipment_id ? (d.equipment || []).filter(function (q) { return q.id === p.equipment_id; })[0] : null;
        return badged(prnZone(p, at(function (x) { return (x.target === 'printer' && x.printer_id === p.id) || (!!p.equipment_id && x.target === 'equipment' && x.equipment_id === p.equipment_id); }), e), badge(cid));
      }).join('');
      if (cid) eqHtml += (d.equipment || []).filter(function (e) { return e.company_id === cid && !linked[e.id]; }).map(function (e) { return badged(eqZone(e, at(function (x) { return x.target === 'equipment' && x.equipment_id === e.id; }), ''), badge(cid)); }).join('');
    });
    var noBox = tx('no_storage_boxes') + (d.config.inventory ? tx('create_one_with_create') : '') + '.</p>';
    return '<div class="hal-board' + (S.pick ? ' picking' : '') + tx('data_board_drag_a') +
      '<section class="hal-bd free' + (folded('free') ? ' folded' : '') + tx('data_drop_waiting_area') + (folded('free') ? tx('buy') + free.length + tx('collapsed_drag_here_to') : tx('sensors_not_attached_yet')) + '</small>' + foldBtn('free') + '</header>' + (folded('free') ? '' : '<div class="hal-chips">' + (free.length ? freeHtml(free) : tx('all_sensors_are_attached')) + '</div>') + '</section>' +
      tx('storage_boxes') + (d.config.inventory && (sc !== 'company' || (d.companies || []).length) ? tx('create_storage_box') : '') + '</h3>' + (boxHtml ? strip(boxHtml, 'box') : noBox) +
      (prHtml ? tx('printers') + strip(prHtml, 'printer') : '') +
      (eqHtml ? tx('company_equipment') + strip(eqHtml, 'equip') : '') + '</div>';
  }
  /** ‹ › 단추 — 넘칠 때만 · 끝에 닿으면 그쪽 단추를 숨김 · 넘긴 자리 기억(다시 그려도) */
  function stripBind() {
    S.stripX = S.stripX || {};
    qa('[data-strip]').forEach(function (w) {
      var k = w.getAttribute('data-strip'), el = w.querySelector('.hal-strip');
      var upd = function () { var max = el.scrollWidth - el.clientWidth - 2; w.classList.toggle('can-l', el.scrollLeft > 2); w.classList.toggle('can-r', el.scrollLeft < max); S.stripX[k] = el.scrollLeft; };
      if (S.stripX[k]) el.scrollLeft = S.stripX[k];
      el.addEventListener('scroll', upd, { passive: true }); upd();
      // 1.7.10 마우스로 끌어 좌우로 (센서 칩 · 단추에서 시작하면 그것을 끌거나 누름) — 터치는 손가락으로 그냥 밀림
      // 1.7.10 마우스로 끌어 좌우로 · 1.7.14 보관함을 위로 끌면 👤 · 🏢 탭으로 옮기기 (어디를 잡든 — 센서 칩 · 단추는 빼고). 터치는 손가락으로 밀기 · 옮기기는 ⇄ 단추
      var pan = null;
      var tabAt = function (x, y) { var t = document.elementFromPoint(x, y); t = t && t.closest('.hal-scope [data-scope]'); var to = t && t.getAttribute('data-scope'); return t && pan && pan.bin && tabOk(to, pan.from) ? t : null; };
      el.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('[data-chip],button,a,input')) return;
        var bin = e.target.closest('[data-mv-name]');
        pan = { x: e.clientX, y: e.clientY, l: el.scrollLeft, mode: '', id: e.pointerId, bin: bin, name: bin && bin.getAttribute('data-mv-name'), from: bin ? +bin.getAttribute('data-mv-from') : 0 };
        e.preventDefault();   // 글자 선택 · 사진 끌기로 넘어가지 않게
        document.addEventListener('pointermove', move, true); document.addEventListener('pointerup', end, true); document.addEventListener('pointercancel', end, true);   // 줄 밖으로 빨리 나가도 이어 받음
      });
      var move = function (e) {
        if (!pan || e.pointerId !== pan.id) return;
        var dx = e.clientX - pan.x, dy = e.clientY - pan.y;
        if (!pan.mode) {
          if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
          pan.mode = pan.bin && dy < 0 && -dy > Math.abs(dx) ? 'box' : 'pan';
          try { el.setPointerCapture(e.pointerId); } catch (er) {}
          if (pan.mode === 'pan') w.classList.add('panning');
          else {
            S.root.classList.add('hal-boxdrag'); pan.bin.classList.add('lifting');
            pan.ghost = document.createElement('div'); pan.ghost.className = 'hal-ghost'; pan.ghost.textContent = '📦 ' + pan.name; document.body.appendChild(pan.ghost);
          }
        }
        e.preventDefault();
        if (pan.mode === 'pan') { el.scrollLeft = pan.l - dx; return; }
        pan.ghost.style.left = e.clientX + 12 + 'px'; pan.ghost.style.top = e.clientY + 12 + 'px';
        var t = tabAt(e.clientX, e.clientY);
        qa('.hal-scope .over').forEach(function (o) { if (o !== t) o.classList.remove('over'); }); if (t) t.classList.add('over');
        pan.ghost.classList.toggle('ok', !!t);
      };
      var end = function (e) {
        if (!pan) return;
        var p = pan, t = p.mode === 'box' && e.type === 'pointerup' ? tabAt(e.clientX, e.clientY) : null;
        pan = null; w.classList.remove('panning'); S.root.classList.remove('hal-boxdrag');
        document.removeEventListener('pointermove', move, true); document.removeEventListener('pointerup', end, true); document.removeEventListener('pointercancel', end, true);
        qa('.hal-scope .over').forEach(function (o) { o.classList.remove('over'); });
        if (p.ghost) p.ghost.remove(); if (p.bin) p.bin.classList.remove('lifting');
        try { el.releasePointerCapture(e.pointerId); } catch (er) {}
        if (p.mode) el.addEventListener('click', function stop(ev) { ev.stopPropagation(); ev.preventDefault(); el.removeEventListener('click', stop, true); }, true);   // 끈 뒤의 누름은 「붙이기」로 치지 않음
        if (t) boxMove(p.name, p.from, t.getAttribute('data-scope') === 'mine' ? 0 : -1);
      };
      w.querySelectorAll('[data-sc]').forEach(function (b) {
        var dir = +b.getAttribute('data-sc');
        b.onclick = function () { el.scrollBy({ left: dir * Math.max(180, el.clientWidth * 0.8), behavior: 'smooth' }); };
        b.addEventListener('dragover', function (e) { e.preventDefault(); el.scrollLeft += dir * 14; });   // 끄는 중에 단추 위에 대면 넘어감
      });
    });
  }
  function placeTo(id, z) {
    var x = find(id); if (!x) return;
    if (x.perm === 'view') { toast(tx('company_devices_can_only'), true); return; }
    var t = z.getAttribute('data-drop'), loc = z.getAttribute('data-loc') || '', ref = +(z.getAttribute('data-ref') || 0);
    S.pick = 0;
    if (t === '' ? x.target === 'other' : t === 'location' ? x.target === 'location' && bkey(x.location) === bkey(loc) && +(x.company_id || 0) === ref : x.target === t && (t === 'printer' ? x.printer_id : x.equipment_id) === ref) { redraw(); return; }   // 제자리
    api('POST', '/devices/' + id + '/place', { target: t, location: loc, ref: ref }).then(function (r) { toast(r.message); S.d = r.data.overview; redraw(); }).catch(function (e) { fail(e); redraw(); });
  }
  function reload() { return api('GET', '/me').then(function (r) { S.d = r.data; redraw(); }); }
  function tabOk(to, from) { return to === 'company' ? !(from > 0 && Object.keys(coMap()).length < 2) : to === 'mine' && from > 0; }
  function coMap() { var m = {}; (S.d.companies || []).forEach(function (c) { m[c.id] = c.name; }); return m; }
  /** 1.7.12 📦 보관함 통째로 옮기기 — to: 0 개인 · 업체 번호 · -1 이면 업체에서 고름(하나면 그 업체) */
  function boxMove(name, from, to) {
    var cos = coMap(), opts = (from ? [[0, tx('personal')]] : []).concat(Object.keys(cos).filter(function (k) { return +k !== from; }).map(function (k) { return [+k, '🏢 ' + cos[k]]; }));
    if (to === -1) opts = opts.filter(function (o) { return o[0] > 0; });
    else if (to != null) opts = opts.filter(function (o) { return o[0] === to; });
    if (!opts.length) { toast(tx('nowhere_to_move_it'), true); return; }
    var dup = function (t) { return (S.d.boxes || []).some(function (x) { return +(x.company_id || 0) === t && bkey(x.name) === bkey(name); }); };
    var go = function (t, label) {
      if (!confirm('📦 「' + name + tx('to') + label + tx('move_it_whole_filament') + (t > 0 ? tx('it_will_count_toward') : '') + (dup(t) ? tx('a_storage_box_with') : ''))) return;
      api('POST', INV + '/move', { name: name, from: from, to: t }).then(function (r) { toast(r.message || tx('moved')); return reload(); }).catch(fail);
    };
    if (opts.length === 1) { go(opts[0][0], opts[0][1]); return; }
    var ov = modal('⇄ 「' + esc(name) + tx('move'), tx('move_where') + opts.map(function (o, i) { return '<label class="' + (o[0] ? 'co' : 'me') + '"><input type="radio" name="bx-to" value="' + o[0] + '"' + (i === 0 ? ' checked' : '') + '> ' + esc(o[1]) + '</label>'; }).join('') + '</div>', { ok: tx('move_2'), onSave: function (w) {
      var r = w.querySelector('input[name="bx-to"]:checked'), t = r ? +r.value : opts[0][0], lb = opts.filter(function (o) { return o[0] === t; })[0];
      setTimeout(function () { go(t, lb ? lb[1] : ''); }, 0); return Promise.resolve();
    } });
  }
  function boxAct(b) {
    var a = b.getAttribute('data-box-act'), name = b.getAttribute('data-name') || '';
    if (a === 'move') { boxMove(name, +b.getAttribute('data-from'), null); return; }
    if (a === 'new') {
      // 1.7.8 누구 보관함인지 고름 — 📡 전체: 👤 개인 · 🏢 업체마다 / 👤 내 기기: 개인 / 🏢 업체 기기: 업체 (하나면 그 업체)
      var sc = scope(), own = (sc === 'company' ? [] : [[0, tx('personal')]]).concat(sc === 'mine' ? [] : (S.d.companies || []).map(function (c) { return [c.id, '🏢 ' + c.name]; }));
      var html = tx('storage_box_name') +
        (own.length > 1 ? tx('whose_storage_box') + own.map(function (o, i) { return '<label class="' + (o[0] ? 'co' : 'me') + '"><input type="radio" name="bx-own" value="' + o[0] + '"' + (i === 0 ? ' checked' : '') + '> ' + esc(o[1]) + '</label>'; }).join('') + '</div>'
          : '<p class="hal-hint">' + esc(own[0] ? own[0][1] : tx('personal')) + tx('storage_box_2'));
      var ov = modal(tx('create_storage_box_2'), html, { ok: tx('create'), onSave: function (w) {
        var nm = (w.querySelector('[data-bx-name]').value || '').trim(), r = w.querySelector('input[name="bx-own"]:checked'), cid = r ? +r.value : own[0] ? own[0][0] : 0;
        if (!nm) return Promise.reject(new Error(tx('please_enter_a_storage')));
        return api('POST', INV, { name: nm, company_id: cid }).then(function (res) { toast(res.message || tx('storage_box_created')); return reload(); });
      } });
      var inp = ov.querySelector('[data-bx-name]'); if (inp) inp.focus();
    } else if (a === 'rename') {
      var to = (prompt('「' + name + tx('new_name_the_storage'), name) || '').trim(); if (!to || to === name) return;
      api('POST', INV + '/rename', { from: name, to: to }).then(function (r) { toast(r.message || tx('renamed')); return reload(); }).catch(fail);
    } else if (a === 'del') {
      var rolls = +b.getAttribute('data-rolls'), loose = b.getAttribute('data-loose') === '1';
      if (rolls > 0) { toast('🧵 「' + name + tx('has') + rolls + tx('rolls_move_them_in'), true); return; }
      var on = S.d.devices.filter(function (x) { return x.target === 'location' && bkey(x.location) === bkey(name); });
      if (!confirm(loose ? '「' + name + tx('move_3') + on.length + tx('sensors_to_the_waiting') : tx('delete_the_empty_storage') + name + tx('s_18') + (on.length ? tx('attached_sensors') + on.length + tx('will_go_to_the') : ''))) return;
      on.reduce(function (p, x) { return p.then(function () { return api('POST', '/devices/' + x.id + '/place', { target: '' }); }); }, Promise.resolve())
        .then(function () { return loose ? { message: tx('moved_the_sensors_to') } : api('POST', INV + '/delete', { name: name, company_id: 0 }); })
        .then(function (r) { toast(r.message); return reload(); }).catch(function (e) { fail(e); reload(); });
    }
  }
  function boardBind() {
    var bd = q('[data-board]'); if (!bd) return;
    var over = function (z) { qa('.hal-bd.over').forEach(function (o) { if (o !== z) o.classList.remove('over'); }); if (z) z.classList.add('over'); };
    bd.onclick = function (e) {
      var c = e.target.closest('[data-chip]');
      if (c) { var id = +c.getAttribute('data-chip'); if (find(id).perm === 'view') { toast(tx('company_devices_can_only'), true); return; } if (S.pick && S.pick !== id) { var zz = c.closest('[data-drop]'); if (zz) { placeTo(S.pick, zz); return; } } S.pick = S.pick === id ? 0 : id; redraw(); return; }
      var rg = e.target.closest('[data-rng-h],[data-rng-t]');   // 1.9.0 🔔 온습도계 → 알림 구간
      if (rg && !S.pick) { e.preventDefault(); e.stopPropagation(); rangeBox(find(rg.getAttribute('data-rng-h')) || null, find(rg.getAttribute('data-rng-t')) || null); return; }
      var a = e.target.closest('[data-box-act]'); if (a) { boxAct(a); return; }
      var z = e.target.closest('[data-drop]'); if (z && S.pick) placeTo(S.pick, z);
    };
    bd.ondragstart = function (e) {
      var c = e.target.closest && e.target.closest('[data-chip]'); if (!c) return; e.dataTransfer.setData('text/plain', c.getAttribute('data-chip')); e.dataTransfer.effectAllowed = 'move'; bd.classList.add('picking'); };
    bd.ondragend = function () { bd.classList.remove('picking'); over(null); };
    bd.ondragover = function (e) { var z = e.target.closest('[data-drop]'); if (!z) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; over(z); };
    bd.ondrop = function (e) { var z = e.target.closest('[data-drop]'); if (!z) return; e.preventDefault(); over(null); var id = +e.dataTransfer.getData('text/plain'); if (id) placeTo(id, z); };
  }
  /* 1.7.0 🗺️ 연결 지도 — 어디서 받아(🏠 Home Assistant · SmartThings) → 어느 기기가 → 어디에 붙어(📦 보관함 · 🖨️ 프린터 · 🏭 장비 · 대기 칸) → 어느 확장으로 이어지는지 한눈에
     선: 초록 = 값이 들어옴 · 회색 점선 = 끊김 · 아직 값 없음. 마디에 마우스를 올리면 그 마디의 선만 진하게, 기기를 누르면 고치기 */
  /** 1.7.2 프린터 사진(프린터 라운지 · 3D 카탈로그) — 없거나 못 불러오면 🖨️ */
  function prIcon(p) { var u = String((p && p.image) || ''); return /^(https?:\/\/|\/)[^"'<>\s]+$/.test(u) ? '<img class="hal-pimg" src="' + esc(u) + '" alt="" loading="lazy" onerror="this.replaceWith(\'🖨️\')">' : '🖨️'; }
  /* 1.14.0 🗺️ 연결 지도 필터 — 전체 · 👤 개인 · 🏢 업체마다 (이 브라우저에 기억) */
  function mapPick() { var v = pref('mapco', 'all'); return v === 'all' || v === 'mine' || coList().some(function (c) { return String(c.id) === v; }) ? v : 'all'; }
  function mapKeep(cid) { var f = mapPick(); return f === 'all' || (f === 'mine' ? !cid : +cid === +f); }
  function mapBar() {
    if (!hasCo()) return '';
    var f = mapPick(), n = function (fn) { return S.d.devices.filter(fn).length + (S.d.printers || []).filter(fn).length; };
    var opts = [['all', '📡', tx('all_2'), n(function () { return true; })], ['mine', '👤', tx('personal_3'), n(function (x) { return !x.company_id; })]].concat(coList().map(function (c) { return [String(c.id), '🏢', c.name, n(function (x) { return +x.company_id === c.id; })]; }));
    return tx('s_19') + opts.map(function (o) { return '<button type="button" role="tab" data-mapco="' + esc(o[0]) + '" class="' + (f === o[0] ? 'on' : '') + '" aria-selected="' + (f === o[0]) + '"><i aria-hidden="true">' + o[1] + '</i>' + esc(o[2]) + '<em>' + o[3] + '</em></button>'; }).join('') + '</div>';
  }
  function mapView() {
    var d = S.d, N = {}, cols = [[], [], [], [], []], E = [], K = [[], []];   // 1.16.0 💻 중계 PC → 📥 받는 곳 → 📡 기기 → 📌 붙인 곳 → 🔗 이어지는 곳 · K = 앞 두 칸의 차례 (같은 PC 끼리 나란히)
    // 1.7.3 많아도 보이게 — 마디는 아이콘 · 이름만, 값 · 상태 같은 설명은 마우스를 올리면 (title)
    var node = function (c, id, html, cls, attrs, sortKey) {
      if (N[id]) return; N[id] = 1;
      var tip = esc(html.replace(/<small>/g, ' · ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim());
      attrs = attrs || ''; attrs = attrs.indexOf('title="') >= 0 ? attrs.replace('title="', 'title="' + tip + ' — ') : attrs + ' title="' + tip + '"';
      cols[c].push('<div class="hal-mn ' + (cls || '') + '" data-n="' + esc(id) + '"' + attrs + '>' + html + '</div>');
      if (c < 2) K[c].push(sortKey || '\uffff' + id);
    };
    var edge = function (a, b, live) { for (var i = 0; i < E.length; i++) if (E[i][0] === a && E[i][1] === b) { E[i][2] = E[i][2] || live; return; } E.push([a, b, live]); };
    var go2 = function (u) { return u ? ' data-href="' + esc(u) + '" role="link" tabindex="0"' : ''; };   // 1.9.5 🔗 붙인 곳 · 이어지는 곳 → 그 화면
    var INV = d.config.inventory, prOf = {}; (d.printers || []).forEach(function (p) { prOf[p.id] = p; });
    var eqCo = {}; (d.equipment || []).forEach(function (e) { eqCo[e.id] = e.company_id; });
    var lbl = function (ic, t, sub) { return '<i aria-hidden="true">' + ic + '</i><span><b>' + esc(t) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span>'; };
    // 1.16.0 💻 중계 PC — 프린터 연결 프로그램 · Matter 중계 · MQTT 중계가 같은 PC 면 하나로 (「GBOOK (Windows)」 = 「GBOOK」)
    var pcK = function (n) { return String(n || '').replace(/\s*\((windows|linux|mac|macos)\)\s*$/i, '').trim(); };
    var pcNode = function (name) { var nm = pcK(name); if (!nm) return ''; var id = 'pc:' + nm.toLowerCase(); node(1, id, lbl('💻', nm, tx('relay_pc_sends_from')), 'k-pc', '', nm.toLowerCase() + ' 0'); return id; };   // 1.16.2 받는 곳 칸 안 — 그 PC 의 받는 곳 바로 위 · 선은 왼쪽으로
    var boxOf = {}, boxOfC = {}; (d.boxes || []).forEach(function (b) { if (!boxOf[bkey(b.name)]) boxOf[bkey(b.name)] = b; boxOfC[(+(b.company_id || 0)) + '|' + bkey(b.name)] = b; });   // 1.9.5 주인(개인 · 업체)마다
    var inst = (d.smartthings && d.smartthings.installs) || [], stOf = {};
    inst.forEach(function (s) { (s.site_devices || []).forEach(function (id) { stOf[id] = s; }); if (s.device_id) stOf[s.device_id] = stOf[s.device_id] || s; });
    // 1.7.1 🖨️ 내 프린터 모두 — 프린터 라운지가 직접 받는 연결(💻 PC 연결 프로그램)도 · 출력 상태 · 마지막으로 받은 때
    var lnk = {}; (d.printers || []).forEach(function (p) { if (p.equipment_id) lnk[p.equipment_id] = p.id; });
    var PST = { printing: tx('printing_2'), paused: tx('paused_2'), done: tx('finished_2'), failed: tx('failed_2'), idle: tx('idle') };
    (d.printers || []).forEach(function (p) {
      if (!mapKeep(p.company_id)) return;   // 1.14.0 🗺️ 필터
      var tn = 't:p:' + p.id, sub = [tx('printer')];
      if (PST[p.state]) sub.push(PST[p.state]); if (p.seen) sub.push(agoText(p.seen));
      var on = !!p.live || d.devices.some(function (x) { return x.target === 'printer' && x.printer_id === p.id && !x.stale && !x.never; });   // 연결이 꺼졌으면 회색으로 흐릿하게
      node(3, tn, lbl(prIcon(p), p.name, esc(sub.join(' · ') + (on ? '' : tx('link_off')))), 'k-printer' + (on ? '' : ' gone'), go2(p.company_id ? '/my-printer/company' : '/my-printer'));
      node(4, 'x:mpr', lbl('🖨️', tx('printer_lounge_2'), tx('print_status_ambient_temp')), 'k-ext', go2('/my-printer')); edge(tn, 'x:mpr', !!p.live);
      if (p.equipment_id && d.config.inventory) { node(4, 'x:eq', lbl('🏭', tx('company_equipment_2'), tx('equipment_status_temp_humidity')), 'k-ext', go2('/inventory?tab=equipment')); edge(tn, 'x:eq', !!p.live); }   // 1.7.9 이어진 업체 장비
      // 1.7.4 사이트 ⇄ 💻 PC(라즈베리파이)의 연결 프로그램 ⇄ 프린터 — 프린터 라운지와 같은 이름 · SimplyPrint 는 따로
      if (p.via === 'simply') { node(1, 'src:simply', lbl('🔗', 'SimplyPrint', tx('receives_printer_status_via')), 'k-hook'); edge('src:simply', tn, !!p.live); }
      else if ((p.via === 'script' || (p.seen && !p.via)) && p.host) { var pc = pcNode(p.host), pn = 'src:pl:' + pc; node(1, pn, lbl('🖨️', 'MprLink', tx('printer_lounge_link_program')), 'k-hook sub', '', pcK(p.host).toLowerCase() + ' 1'); edge(pc, pn, !!p.live); edge(pn, tn, !!p.live); }   // 1.16.0 💻 PC → 🖨️ 프린터 연결   // 1.14.0 💻 PC 이름 (내 프린터 0.1.95+) — 같은 PC 의 Matter 중계와 같은 이름 · 아이콘만 다르게
      else if (p.via === 'script' || (p.seen && !p.via)) { node(1, 'src:pc', lbl('🖨️', 'MprLink', tx('printer_lounge_link_program_2')), 'k-hook'); edge('src:pc', tn, !!p.live); }
    });
    d.devices.forEach(function (x) {
      if (!mapKeep(x.company_id)) return;   // 1.14.0 🗺️ 필터
      var live = !x.stale && !x.never, c = capsOf(x), dn = 'd:' + x.id, v = [];
      if (c.temp && x.temp != null) v.push('🌡️ ' + x.temp + '°'); if (c.hum && x.humidity != null) v.push('💧 ' + x.humidity + '%'); if (c.state) v.push(x.is_on ? tx('running_2') : tx('idle_2'));
      // ① 출처
      var s = srcOf(x) === 'st' ? stOf[x.id] : null, sn;
      if (srcOf(x) === 'ha') { sn = 'src:ha'; node(1, sn, haLogo() + tx('home_assistant_home_sending'), 'k-ha'); }
      else if (srcOf(x) === 'mt') { var mpc = pcNode(x.ha_server_name); sn = 'src:mt:' + (mpc || x.ha_server || ''); node(1, sn, mtLogo() + tx('matter_matter_relay_matter'), 'k-mt' + (mpc ? ' sub' : ''), '', pcK(x.ha_server_name).toLowerCase() + ' 2'); if (mpc) edge(mpc, sn, live); }   // 1.16.0 💻 PC → 🧩 Matter
      else if (srcOf(x) === 'mq') { var qpc = pcNode(x.ha_server_name); sn = 'src:mq:' + (qpc || x.ha_server || ''); node(1, sn, mqLogo() + tx('mqtt_bt_mqtt_relay'), 'k-mq' + (qpc ? ' sub' : ''), '', pcK(x.ha_server_name).toLowerCase() + ' 3'); if (qpc) edge(qpc, sn, live); }   // 1.16.0 💻 PC → 📨 MQTT · 📶
      else if (s) { sn = 'src:st' + s.id; node(1, sn, stLogo() + '<span><b>' + esc(s.location || 'SmartThings') + '</b><small>SmartThings' + (s.status === 'active' ? '' : ' · ⚠️ ' + esc(s.status)) + '</small></span>', 'k-st'); }
      else { sn = 'src:st'; node(1, sn, stLogo() + tx('smartthings_cloud_sensors'), 'k-st'); }
      // ② 기기
      node(2, dn, lbl(c.state ? '⚙️' : c.temp && c.hum ? '🌡️' : c.hum ? '💧' : '🌡️', x.name, (live ? '<em class="on">●</em> ' : '<em class="off">●</em> ') + (v.join(' · ') || agoText(x.seen))), 'k-dev' + (live ? '' : ' off') + (x.over ? ' hot' : ''), x.perm === 'view' ? '' : ' data-edit="' + x.id + tx('role_button_tabindex_0'));
      edge(sn, dn, live);
      // ③ 붙인 곳
      var tn, placed = x.target !== 'other' && !!x.where;
      if (!placed) {   // 1.7.11 대기 칸 안에 그 센서들 이름 (끊긴 것은 흐리게)
        tn = 't:wait';
        var wl = d.devices.filter(function (o) { return !(o.target !== 'other' && !!o.where); });
        node(3, tn, lbl('📡', tx('waiting_area') + wl.length, tx('not_attached_yet_2')) + '<ul class="hal-mn-list">' + wl.map(function (o) { var oc = capsOf(o); return '<li class="' + (!o.stale && !o.never ? 'on' : 'off') + '"><i aria-hidden="true">' + (oc.state ? '⚙️' : oc.temp && oc.hum ? '🌡️' : oc.hum ? '💧' : '🌡️') + '</i>' + esc(o.name) + '</li>'; }).join('') + '</ul>', 'k-wait');
      }
      else if (x.target === 'location') { var b = boxOfC[(+(x.company_id || 0)) + '|' + bkey(x.location)] || boxOf[bkey(x.location)] || { name: x.location, company_id: x.company_id }; tn = 't:l:' + bkey(x.location); node(3, tn, lbl('📦', b.name, b.rolls != null ? tx('storage_boxes_rolls') + b.rolls + tx('s_2') : tx('storage_box')), 'k-box', ' style="--bx:' + boxCol(b) + '"' + (INV ? go2(b.company_id ? '/inventory?tab=stock&company=' + b.company_id + '&box=' + encodeURIComponent(bkey(b.name)) : '/inventory?tab=drawer&box=' + encodeURIComponent(b.name)) : '')); }
      else if (x.target === 'printer') { tn = 't:p:' + x.printer_id; node(3, tn, lbl('🖨️', x.where, tx('printer')), 'k-printer', go2(prOf[x.printer_id] && prOf[x.printer_id].company_id ? '/my-printer/company' : '/my-printer')); }
      else if (lnk[x.equipment_id]) { tn = 't:p:' + lnk[x.equipment_id]; }   // 1.7.9 프린터와 이어진 장비 — 프린터 하나로
      else { tn = 't:e:' + x.equipment_id; node(3, tn, lbl('🏭', x.where, tx('equipment')), 'k-equip', INV ? go2('/inventory?tab=equipment' + (eqCo[x.equipment_id] ? '&company=' + eqCo[x.equipment_id] : '')) : ''); }
      edge(dn, tn, live);
      // ④ 이어지는 확장
      if (!placed) return;
      if (x.target === 'location' && d.config.inventory) { node(4, 'x:inv', lbl('🧵', tx('inventory'), tx('storage_box_humidity_drying')), 'k-ext', go2('/inventory?tab=drawer')); edge(tn, 'x:inv', live); }
      if (x.target === 'printer') { node(4, 'x:mpr', lbl('🖨️', tx('printer_lounge_2'), tx('print_status_ambient_temp')), 'k-ext', go2('/my-printer')); edge(tn, 'x:mpr', live); }
      if (x.target === 'equipment' && d.config.inventory) { node(4, 'x:eq', lbl('🏭', tx('company_equipment_2'), tx('equipment_status_temp_humidity')), 'k-ext', go2('/inventory?tab=equipment')); edge(tn, 'x:eq', live); }
      if (c.state && x.target !== 'location') { node(4, 'x:mnt', lbl('🛠', tx('maintenance_log'), tx('runtime_maintenance')), 'k-ext', go2('/maintenance')); edge(tn, 'x:mnt', live); }
    });
    // 1.19.3 🏠 HA · 🔷 SmartThings · 🔗 SimplyPrint 는 중계 PC 없이 사이트로 바로 → 🌐 3DS 서버와 바로 선 (1.16.7 은 중계 PC 밑에 그렸음)
    //        💻 PC 이름 없는 MprLink 만 중계 PC 가 하나일 때 그 PC 밑에 — 📱 폰 앱(「(앱)」)은 MprLink 를 안 돌리니 빼고
    var pcs = Object.keys(N).filter(function (k) { return k.indexOf('pc:') === 0; });
    var realPc = pcs.filter(function (k) { return !/\((앱|app)\)$/i.test(k); });
    var liveOf = function (k) { return E.some(function (e) { return e[0] === k && e[2]; }); };
    if (pcs.length === 1 && realPc.length === 1 && N['src:pc']) edge(realPc[0], 'src:pc', liveOf('src:pc'));
    var direct = Object.keys(N).filter(function (k) { return /^src:(ha|st|simply)/.test(k) || (k === 'src:pc' && !E.some(function (e) { return e[1] === 'src:pc' && /^pc:/.test(e[0]); })); });
    // 1.16.8 🌐 3DS 서버 — 맨 위 · 중계 PC 마다 · 바로 보내는 받는 곳마다 선 (값이 모이는 곳)
    if (pcs.length || direct.length) { node(1, 'srv:3ds', lbl('🌐', tx('s_3ds_server'), tx('this_site_where_the')), 'k-srv', '', ' '); pcs.concat(direct).forEach(function (k) { edge('srv:3ds', k, liveOf(k)); }); }
    S.mapE = E;
    var T = [['💻', tx('relay_pc')], ['📥', tx('source_2')], ['📡', tx('device')], ['📌', tx('attached_to')], ['🔗', tx('linked_to')]];
    [0, 1].forEach(function (c) { cols[c] = cols[c].map(function (h, j) { return [K[c][j], j, h]; }).sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]; }).map(function (x) { return x[2]; }); });   // 1.14.0 같은 PC 끼리 나란히
    var vis = cols.map(function (c, i) { return i; }).filter(function (i) { return i > 0 || cols[0].length; });   // 중계 PC 가 없으면(HA · SmartThings 만) 그 칸은 빼고
    return tx('a_green_line_means') +
      '<div class="hal-map" data-map><svg class="hal-map-svg" aria-hidden="true"></svg>' + mapBar() + '<div class="hal-map-cols' + (vis.length > 4 ? ' five' : '') + '">' + vis.map(function (i) { var c = cols[i]; return '<div class="hal-map-col"><h4><i aria-hidden="true">' + T[i][0] + '</i>' + T[i][1] + ' <small>' + c.length + '</small></h4>' + (c.join('') || '<p class="hal-hint">—</p>') + '</div>'; }).join('') + '</div></div></div>';
  }
  /** 선 그리기 — 마디의 실제 자리를 재서 곡선으로 (창 크기가 바뀌면 다시) */
  function mapLines() {
    var m = q('[data-map]'); if (!m) return;
    var svg = m.querySelector('svg'), r0 = m.getBoundingClientRect(), pos = {};
    m.querySelectorAll('[data-n]').forEach(function (el) { var r = el.getBoundingClientRect(); pos[el.getAttribute('data-n')] = { l: r.left - r0.left + m.scrollLeft, r: r.right - r0.left + m.scrollLeft, y: r.top - r0.top + m.scrollTop + r.height / 2, t: r.top - r0.top + m.scrollTop, b: r.bottom - r0.top + m.scrollTop }; });   // 좁은 화면은 옆으로 밀림 — 민 만큼 더함
    svg.setAttribute('width', m.scrollWidth); svg.setAttribute('height', m.scrollHeight);
    svg.innerHTML = (S.mapE || []).map(function (e) {
      var a = pos[e[0]], b = pos[e[1]]; if (!a || !b) return '';
      var left = /^(pc|srv):/.test(String(e[0])), x1 = left ? a.l : a.r, x2 = b.l, dx = Math.max(24, (x2 - x1) / 2);   // 1.16.2 💻 PC → 받는 곳: 같은 칸 — 왼쪽 가장자리끼리
      var mid = String(e[0]).indexOf('srv:') === 0 && String(e[1]).indexOf('pc:') === 0, y1 = a.y, y2 = b.y;   // 1.16.9 🌐 3DS 서버 → 중계 PC: 상자 가운데끼리 (아래 가운데 → 위 가운데) · 1.19.3 바로 보내는 받는 곳은 왼쪽 가장자리로
      if (mid) { x1 = (a.l + a.r) / 2; y1 = a.b; x2 = (b.l + b.r) / 2; y2 = b.t; }
      var d = mid ? 'M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + (y1 + 18) + ' ' + x2 + ' ' + (y2 - 18) + ' ' + x2 + ' ' + y2 : left ? 'M' + x1 + ' ' + a.y + ' C' + (x1 - 30) + ' ' + a.y + ' ' + (x2 - 30) + ' ' + b.y + ' ' + x2 + ' ' + b.y : 'M' + x1 + ' ' + a.y + ' C' + (x1 + dx) + ' ' + a.y + ' ' + (x2 - dx) + ' ' + b.y + ' ' + x2 + ' ' + b.y;
      return '<path data-a="' + esc(e[0]) + '" data-b="' + esc(e[1]) + '" class="' + (e[2] ? 'on' : 'off') + (String(e[0]).indexOf('srv:') === 0 ? ' srvl' : '') + '" d="' + d + '"/>' +
        // 1.9.5 선이 붙는 곳 — 양 끝에 점
        '<circle data-a="' + esc(e[0]) + '" data-b="' + esc(e[1]) + '" class="' + (e[2] ? 'on' : 'off') + '" cx="' + x1 + '" cy="' + y1 + '" r="4"/><circle data-a="' + esc(e[0]) + '" data-b="' + esc(e[1]) + '" class="' + (e[2] ? 'on' : 'off') + '" cx="' + x2 + '" cy="' + y2 + '" r="4"/>';
    }).join('');
  }
  function mapBind() {
    var m = q('[data-map]'); if (!m) return;
    mapLines();
    if (!S.mapRs) { S.mapRs = true; var t = 0; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { if (S.root && S.root.querySelector('[data-map]')) mapLines(); }, 120); }); }
    var hl = function (id) {
      var keep = {}; if (id) keep[id] = 1;
      m.querySelectorAll('path,circle').forEach(function (p) { var hit = id && (p.getAttribute('data-a') === id || p.getAttribute('data-b') === id); p.classList.toggle('hl', !!hit); p.classList.toggle('dim', !!id && !hit); if (hit) { keep[p.getAttribute('data-a')] = 1; keep[p.getAttribute('data-b')] = 1; } });
      m.querySelectorAll('[data-n]').forEach(function (el) { el.classList.toggle('dim', !!id && !keep[el.getAttribute('data-n')]); });
    };
    m.addEventListener('mouseover', function (e) { var n = e.target.closest('[data-n]'); hl(n ? n.getAttribute('data-n') : ''); });
    m.addEventListener('mouseleave', function () { hl(''); });
    var open = function (e) { if (e.target.closest('[data-edit]')) return; var h = e.target.closest('[data-href]'); if (!h) return; e.preventDefault(); go(h.getAttribute('data-href')); };   // 1.9.5 🔗 그 화면으로
    m.addEventListener('click', open);
    m.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(e); });
  }
  function redraw() { var y = window.scrollY; draw(); window.scrollTo(0, y); }
  function selBind() {
    qa('[data-sel-on]').forEach(function (b) { b.onclick = function () { S.sel = {}; redraw(); }; });
    qa('[data-sel-off]').forEach(function (b) { b.onclick = function () { S.sel = null; redraw(); }; });
    qa('[data-sel]').forEach(function (c) { c.onchange = function () { var id = c.getAttribute('data-sel'); if (c.checked) S.sel[id] = 1; else delete S.sel[id]; redraw(); }; });
    qa('[data-sel-all]').forEach(function (c) { c.onchange = function () { S.sel = {}; if (c.checked) S.d.devices.forEach(function (x) { S.sel[x.id] = 1; }); redraw(); }; });
    qa('[data-sel-stale]').forEach(function (b) { b.onclick = function () { S.sel = {}; S.d.devices.forEach(function (x) { if (x.stale) S.sel[x.id] = 1; }); redraw(); }; });
    qa('[data-sel-grp]').forEach(function (s) { s.onchange = function () {   // 1.4.6 📁
      var ids = Object.keys(S.sel).map(Number); if (!ids.length || s.value === '-') return;
      s.disabled = true;
      api('POST', '/devices/group', { ids: ids, grp: s.value }).then(function (r) { toast(r.message); S.sel = null; S.d = r.data.overview; redraw(); }).catch(function (e) { fail(e); redraw(); });
    }; });
    qa('[data-sel-del]').forEach(function (b) { b.onclick = function () {
      var ids = Object.keys(S.sel).map(Number); if (!ids.length) return;
      if (!confirm(tx('delete_the') + ids.length + tx('selected_devices_temp_humidity'))) return;
      b.disabled = true; b.textContent = tx('deleting');
      api('POST', '/devices/delete', { ids: ids }).then(function (r) { toast(r.message); S.sel = null; S.d = r.data.overview; redraw(); }).catch(function (e) { fail(e); redraw(); });
    }; });
  }
  /* 1.17.6 📥 AI 연결이 보낸 「붙일 곳」 제안 — ✔ 붙이기는 📍 와 같은 길 (권한 · 💳 센서 칸 한도를 그때 다시 봄) */
  function aiBox() {
    var l = S.d.proposals || []; if (!l.length) return '';
    return tx('ai_suggestions') + l.length + tx('attached_only_when_you') + (l.length > 1 ? tx('attach_all') : '') + tx('dismiss_all') +
      l.map(function (p) { return '<div class="hal-aip-row"><span class="nm">📡 ' + esc(p.device) + '</span><span class="to">→ ' + esc(p.where) + '</span>' + (p.why ? '<small>' + esc(p.why) + '</small>' : '') + '<em>' + esc(p.from || '🤖 AI') + '</em><button type="button" class="hal-btn sm" data-aip-ok="' + esc(p.pid) + tx('attach_button_type_button') + esc(p.pid) + tx('aria_label_dismiss'); }).join('') + '</section>';
  }
  function aiBind() {
    var go = function (pids, kind) { return pids.reduce(function (p, id) { return p.then(function () { return api('POST', '/proposals/' + id + '/' + kind).then(function (r) { toast(r.message); S.d = r.data.overview; }); }); }, Promise.resolve()).then(redraw).catch(function (e) { fail(e); reload(); }); };
    qa('[data-aip-ok]').forEach(function (b) { b.onclick = function () { b.disabled = true; go([b.getAttribute('data-aip-ok')], 'apply'); }; });
    qa('[data-aip-x]').forEach(function (b) { b.onclick = function () { b.disabled = true; go([b.getAttribute('data-aip-x')], 'drop'); }; });
    qa('[data-aip-all]').forEach(function (b) { b.onclick = function () { b.disabled = true; go((S.d.proposals || []).map(function (p) { return p.pid; }), 'apply'); }; });
  }
  function draw() {
    if (S.sel) { var have = {}; S.d.devices.forEach(function (x) { have[x.id] = 1; }); Object.keys(S.sel).forEach(function (k) { if (!have[k]) delete S.sel[k]; }); if (!S.d.devices.length) S.sel = null; }
    var d = S.d, live = d.devices.filter(function (x) { return !x.stale; }).length, over = d.devices.filter(function (x) { return x.over; }).length;
    wrap(tx('iot_link_receives_temp') +
      tx('devices_2') + d.devices.length + '</b>' + (d.limits ? (d.limits.admin ? tx('admin_unlimited') : ' / ' + d.limits.member) : '') + tx('connected_4') + live + '</b></span>' + (over ? tx('over_threshold_3') + over + '</b></span>' : '') + tx('how_to_connect') + (d.devices.length > 1 && !S.sel ? tx('select_multiple') : '') + (d.slots && d.slots.enabled ? ' <button class="hal-btn ghost" data-slot title="' + (d.slots.selling ? tx('buy_sensor_slots_with') : tx('view_cancel_purchased_sensor')) + '">💳 ' + (d.slots.selling ? tx('add_slots') : tx('purchased_slots_3')) + '</button>' : '') + tx('connect_device') +
      srcCard() + aiBox() +
      (d.devices.length ? scopeBar() + (scope() === 'map' ? mapView() : (S.sel ? selBar() : '') + tools() + (pref('view', 'card') === 'board' ? board() : grouped())) +
        '<p class="hal-note">' + (liveSec() ? tx('this_screen_fetches_new') + (liveSec() >= 60 && liveSec() % 60 === 0 ? liveSec() / 60 + tx('min') : liveSec() + tx('s_20')) + tx('by_itself') : tx('refresh_the_page_to')) + tx('home_assistant_sends') + (d.config.send_mode === 'change' ? tx('when_values_change') : (d.config.interval_min || 10) + tx('every')) + tx('and_right_away_when') + (d.config.inventory ? tx('view_filament_drawer_inventory') : '') + '</p>'
        : '<section class="hal-start"><h2>' + haLogo() + tx('home_assistant_takes_three')));
    qa('[data-guide]').forEach(function (b) { b.onclick = function () { guideBox(); }; });
    qa('[data-srctab]').forEach(function (b) { b.onclick = function () { setPref('srctab', b.getAttribute('data-srctab')); setPref('fold-src', '0'); redraw(); }; });   // 1.7.16 · 1.17.1 접혀 있으면 탭을 누를 때 펼침
    qa('[data-fold]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); var k = b.getAttribute('data-fold'); setPref('fold-' + k, folded(k) ? '0' : '1'); redraw(); }; });   // 1.17.1 접기 (대기 칸은 놓을 곳이라 눌러도 붙이지 않게 stopPropagation)
    qa('[data-scope]').forEach(function (b) { b.onclick = function () { setPref('scope', b.getAttribute('data-scope')); setPref('gf', 'all'); S.lim = 0; redraw(); }; });   // 1.5.0
    qa('[data-gf]').forEach(function (b) { b.onclick = function () { setPref('gf', b.getAttribute('data-gf')); S.lim = 0; redraw(); }; });   // 1.4.6 분류 고르기 · 보기 모양
    qa('[data-src]').forEach(function (b) { b.onclick = function () { setPref('src', b.getAttribute('data-src')); S.lim = 0; redraw(); }; });   // 1.4.7 출처
    qa('[data-co]').forEach(function (b) { b.onclick = function () { setPref('co', b.getAttribute('data-co')); S.lim = 0; redraw(); }; });   // 1.8.0 🏢 업체
    qa('[data-mapco]').forEach(function (b) { b.onclick = function () { setPref('mapco', b.getAttribute('data-mapco')); redraw(); }; });   // 1.14.0 🗺️ 지도 필터
    qa('[data-hasrv]').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-hasrv'); setPref('hasrv', v); if (v !== 'all') setPref('src', 'ha'); S.lim = 0; redraw(); }; });   // 1.8.0 🏠 HA 서버
    moreBind();
    qa('[data-view]').forEach(function (b) { b.onclick = function () { setPref('view', b.getAttribute('data-view')); redraw(); }; });
    qa('details[data-grp]').forEach(function (g) { g.addEventListener('toggle', function () { var was = grpFold(g.getAttribute('data-grp')); try { localStorage.setItem('hal:grp:' + g.getAttribute('data-grp'), g.open ? '1' : '0'); } catch (e) {} if (g.open && was) redraw(); }); });   // 1.4.7 접혀 있던 묶음을 펴면 그 카드를 그림   // 1.4.6 접은 분류 기억
    stBind();
    aiBind();
    boardBind();
    stripBind();
    mapBind();
    qa('[data-snap]').forEach(function (b) { snapLoad(b); b.onclick = function () { var u = SNAP[b.getAttribute('data-snap')]; if (u && u.url) modal('📷 ' + esc(find(b.getAttribute('data-snap')).name), '<img class="hal-snapbig" src="' + u.url + '" alt="">'); }; });
    qa('[data-new]').forEach(function (b) { b.onclick = function () { connectBox(); }; });
    qa('[data-new-mt]').forEach(function (b) { b.onclick = function () { form(null, 'mt'); }; });   // 1.10.0 🧩
    qa('[data-guide-mt]').forEach(function (b) { b.onclick = function () { guideBox('mt'); }; });
    mtWinBind(document);   // 1.11.0 🪟
    mqBind();   // 1.15.0 📨
    qa('[data-slot]').forEach(function (b) { b.onclick = function () { slotBox(); }; });   // 1.4.8 💳
    qa('[data-edit]').forEach(function (b) { b.onclick = function () { var dv = find(b.getAttribute('data-edit')); if (dv && dv.perm === 'view') { toast(tx('company_devices_can_only_2')); return; } form(dv); }; });   // 1.5.0
    qa('[data-place]').forEach(function (b) { b.onclick = function () { placePick(+b.getAttribute('data-place')); }; });   // 1.17.1 📍 보드처럼 눌러서 붙이기
    qa('[data-gfil]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); var p = b.getAttribute('data-gfil').split('|'), cur = (S.gfil = S.gfil || {})[p[0]] || 'all'; S.gfil[p[0]] = cur === p[1] ? 'all' : p[1]; redraw(); }; });   // 1.17.3 묶음 거르기 (제목 줄 안이라 접기 · 펼치기는 하지 않음)
    qa('[data-gsort]').forEach(function (s) { s.onclick = function (e) { e.stopPropagation(); }; s.onchange = function () { setPref('sort', s.value); redraw(); }; });   // 1.17.3 정렬 (이 브라우저에 기억)
    qa('[data-xtra]').forEach(function (x) { x.addEventListener('toggle', function () { S.xo = S.xo || {}; S.xo[x.getAttribute('data-xtra')] = x.open; }); });   // 1.17.1 접은 사진 · 센서 목록
    qa('[data-yaml]').forEach(function (b) { b.onclick = function () { yamlBox(find(b.getAttribute('data-yaml'))); }; });
    qa('[data-revive]').forEach(function (b) { b.onclick = function () { revive(b); }; });
    selBind();
  }

  /* 1.1.2 SmartThings 로고 (공식 심볼 — 하늘색 둥근 네모 안의 흰 허브 · 연결점). 그림 파일 없이 SVG 한 줄: 흰 바탕 + 심볼. 상표는 삼성의 것 — 연결 대상을 가리키는 데에만 씀
   *   심볼 모양 출처: Simple Icons (CC0) — SmartThings press kit */
  var ST_PATH = 'M11.51 0C8.338 0 5.034.537 2.694 2.694.5 5.174 0 8.464 0 11.525v.942c0 3.165.537 6.499 2.694 8.84C5.188 23.513 8.494 24 11.569 24h.854c3.18 0 6.528-.53 8.883-2.694C23.514 18.811 24 15.5 24 12.423v-.853c0-3.18-.53-6.528-2.694-8.876C18.826.494 15.544 0 12.482 0zM12 3.505c1.244 0 2.256.99 2.256 2.206 0 1.065-.685 1.976-1.715 2.181v1.59c1.48.214 2.528 1.43 2.528 2.934 0 1.654-1.377 3-3.07 3-1.692 0-3.068-1.346-3.068-3 0-.17.017-.335.045-.497l-1.536-.488a2.258 2.258 0 01-1.962 1.12c-.237 0-.471-.037-.698-.11-1.183-.375-1.833-1.622-1.449-2.78a2.246 2.246 0 012.146-1.524c.237 0 .471.036.698.108a2.23 2.23 0 011.313 1.098c.204.391.282.823.232 1.249l1.535.488c.44-.86 1.378-1.453 2.384-1.599V7.892c-1.029-.205-1.896-1.116-1.896-2.181 0-1.217 1.012-2.206 2.257-2.206zm0 .882c-.747 0-1.354.594-1.354 1.324 0 .73.607 1.324 1.354 1.324.746 0 1.354-.594 1.354-1.324 0-.73-.608-1.324-1.354-1.324zm6.522 3.75c.98 0 1.843.613 2.146 1.525.186.56.138 1.158-.135 1.683-.274.526-.74.915-1.314 1.096-.227.073-.461.11-.698.11a2.258 2.258 0 01-1.962-1.12l-.634.201-.278-.838.632-.202a2.21 2.21 0 011.546-2.347c.226-.072.46-.108.697-.108zM5.476 9.02c-.588 0-1.105.368-1.287.915-.23.694.159 1.442.869 1.668.136.043.277.065.419.065.588 0 1.105-.368 1.287-.915a1.29 1.29 0 00-.081-1.01 1.338 1.338 0 00-.788-.658 1.377 1.377 0 00-.42-.065zm13.045 0c-.142 0-.282.021-.419.065a1.32 1.32 0 00-.869 1.668c.182.547.7.915 1.287.915.142 0 .283-.022.42-.065.344-.11.623-.343.787-.659.165-.315.193-.673.082-1.009a1.348 1.348 0 00-1.288-.915zM12 10.474c-1.095 0-1.986.871-1.986 1.942 0 1.07.89 1.941 1.986 1.941 1.094 0 1.985-.87 1.985-1.94 0-1.072-.89-1.943-1.985-1.943zm-2.706 4.831l.73.519-.39.526c.709.757.801 1.925.16 2.787-.423.57-1.106.91-1.827.91-.478 0-.937-.147-1.325-.422a2.177 2.177 0 01-.499-3.082 2.28 2.28 0 012.76-.71zm5.41 0l.392.528a2.285 2.285 0 012.76.71 2.178 2.178 0 01-.499 3.082 2.275 2.275 0 01-1.325.421 2.28 2.28 0 01-1.827-.91 2.172 2.172 0 01.16-2.785l-.39-.527zm-6.734 1.21c-.433 0-.843.205-1.097.547-.44.59-.304 1.42.3 1.849a1.37 1.37 0 001.891-.293c.44-.59.305-1.42-.3-1.85a1.364 1.364 0 00-.794-.252zm8.059 0c-.287 0-.561.088-.795.254a1.307 1.307 0 00-.299 1.849 1.371 1.371 0 001.891.293 1.307 1.307 0 00.3-1.85 1.37 1.37 0 00-1.097-.545Z';
  /* 1.4.3 Home Assistant 로고 (공식 심볼 — 집 · 회로 · SmartThings 하늘색과 구분되게 주황). 그림 파일 없이 SVG 한 줄. 상표는 Home Assistant(Open Home Foundation)의 것 — 연결 대상 표시로만 씀
   *   심볼 모양 출처: Simple Icons (CC0) — home-assistant/assets */
  var HA_PATH = 'M22.939 10.627 13.061.749a1.505 1.505 0 0 0-2.121 0l-9.879 9.878C.478 11.21 0 12.363 0 13.187v9c0 .826.675 1.5 1.5 1.5h9.227l-4.063-4.062a2.034 2.034 0 0 1-.664.113c-1.13 0-2.05-.92-2.05-2.05s.92-2.05 2.05-2.05 2.05.92 2.05 2.05c0 .233-.041.456-.113.665l3.163 3.163V9.928a2.05 2.05 0 0 1-1.15-1.84c0-1.13.92-2.05 2.05-2.05s2.05.92 2.05 2.05a2.05 2.05 0 0 1-1.15 1.84v8.127l3.146-3.146A2.051 2.051 0 0 1 18 12.239c1.13 0 2.05.92 2.05 2.05s-.92 2.05-2.05 2.05c-.25 0-.488-.047-.709-.13L12.9 20.602v3.088h9.6c.825 0 1.5-.675 1.5-1.5v-9c0-.825-.477-1.977-1.061-2.561z';
  function haLogo(cls) { return '<svg class="hal-stl hal-hal' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#18BCF2" d="' + HA_PATH + '"/></svg>'; }
  function stLogo(cls) { return '<svg class="hal-stl' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="2" y="2" width="20" height="20" rx="5" fill="#fff"/><path fill="#15BFFF" d="' + ST_PATH + '"/></svg>'; }

  /* ── 📡 SmartThings 카드 ──
   *  1.1.0 로그인 연결 (API Access App · OAuth): 「🔗 SmartThings 연결하기」 → 삼성 계정 로그인 → 허용 → 돌아와서 「⚙️ 센서 고르기」. 센서 하나가 기기 카드 하나.
   *  0.2.0 예전 방식(연결 코드 · SmartApp)은 관리자가 켰거나 그렇게 이은 것이 있을 때만 접어 둔 칸에 보임 */
  var ST_STATUS = { active: ['on', tx('connected_3')], syncing: ['wait', tx('matching_sensors')], choose: ['wait', tx('please_choose_a_sensor')], unlinked: ['off', tx('not_linked_to_a')], error: ['bad', tx('needs_attention')] };
  /* 1.1.0 💳 고지 — 삼성이 SmartThings API 를 유료 플랜으로 바꾸는 중이라 무료 이용이 중지될 수 있음. 연결하기 전 · 연결한 뒤 · 연결 방법 · 센서 고르기에 늘 보임 */
  var ST_PAY_URL = 'https://blog.smartthings.com/smartthings-updates/a-new-enhanced-smartthings-api-experience/';
  function stPay() {
    return tx('heads_up_samsung_is') +
      tx('if_values_stop_the') + ST_PAY_URL + tx('target_blank_rel_noopener');
  }
  function minsLeft(at) { return Math.max(0, Math.ceil((new Date(at.replace(' ', 'T')) - new Date(S.d.now.replace(' ', 'T'))) / 60000)); }
  /* 1.17.1 접기 — 위 연결 탭 상자(src) · 보드 대기 칸(free) 을 접어 숨김 · 이 브라우저에 기억 (hal:fold-…) */
  function folded(k) { return pref('fold-' + k, '0') === '1'; }
  function foldBtn(k) { var f = folded(k); return '<button type="button" class="hal-fold" data-fold="' + k + '" aria-expanded="' + !f + '" title="' + (f ? tx('expand') : tx('collapse')) + '">' + (f ? tx('expand_2') : tx('collapse_2')) + '</button>'; }
  /* 1.7.16 받는 곳 칸 — 탭으로 SmartThings · 🏠 Home Assistant (HA 로 이은 센서도 같은 자리에서) */
  function srcCard() {
    var d = S.d, ha = d.devices.filter(function (x) { return srcOf(x) === 'ha'; }), st = d.smartthings, ins = (st && st.installs) || [];
    var svs = haServers(), many = svs.length > 1;   // 1.8.0 🏠 HA 서버마다 탭 (하나면 예전처럼 「Home Assistant」 하나)
    var mts = d.devices.filter(function (x) { return srcOf(x) === 'mt'; });   // 1.10.0 🧩
    var mqs = d.devices.filter(function (x) { return srcOf(x) === 'mq'; });   // 1.15.0 📨
    var aps = d.app_relay || [];   // 1.18.0 📱
    var tab = pref('srctab', ''), ok = tab === 'st' || tab === 'mt' || tab === 'mq' || tab === 'ap' || (!many && tab === 'ha') || (many && tab.indexOf('ha:') === 0 && svs.some(function (v) { return 'ha:' + v.id === tab; }));
    if (!ok) tab = ins.length || !ha.length ? 'st' : many ? 'ha:' + svs[0].id : 'ha';
    if (!st && tab === 'st') tab = many ? 'ha:' + svs[0].id : 'ha';
    var stOn = ins.filter(function (x) { return x.status === 'active'; }).length;
    var haTab = function (key, label, xs) { var on = xs.filter(function (x) { return !x.stale && !x.never; }).length; return '<button type="button" role="tab" data-srctab="' + esc(key) + '" class="' + (tab === key ? 'on' : '') + '" aria-selected="' + (tab === key) + '">' + haLogo() + ' ' + recvDot(key) + esc(label) + ' <small>' + (xs.length ? '🟢 ' + on + ' / ' + xs.length : '–') + '</small></button>'; };
    var bar = tx('s_21') + (st ? '<button type="button" role="tab" data-srctab="st" class="' + (tab === 'st' ? 'on' : '') + '" aria-selected="' + (tab === 'st') + '">' + stLogo() + ' ' + (many ? recvDot('st') : '') + 'SmartThings <small>' + (ins.length ? '🟢 ' + stOn + ' / ' + ins.length : '–') + '</small></button>' : '') +
      (many ? svs.map(function (v) { return haTab('ha:' + v.id, v.label, ha.filter(function (x) { return (x.ha_server || '') === v.id; })); }).join('') : haTab('ha', 'Home Assistant', ha)) +
      '<button type="button" role="tab" data-srctab="mt" class="' + (tab === 'mt' ? 'on' : '') + '" aria-selected="' + (tab === 'mt') + '">' + mtLogo() + ' ' + recvDot('mt') + 'Matter <small>' + (mts.length ? '🟢 ' + mts.filter(function (x) { return !x.stale && !x.never; }).length + ' / ' + mts.length : '–') + '</small></button>' +
      '<button type="button" role="tab" data-srctab="mq" class="' + (tab === 'mq' ? 'on' : '') + '" aria-selected="' + (tab === 'mq') + '">' + mqLogo() + ' ' + recvDot('mq') + 'MQTT · BT <small>' + (mqs.length ? '🟢 ' + mqs.filter(function (x) { return !x.stale && !x.never; }).length + ' / ' + mqs.length : '–') + '</small></button>' + '<button type="button" role="tab" data-srctab="ap" class="' + (tab === 'ap' ? 'on' : '') + '" aria-selected="' + (tab === 'ap') + '">📱 ' + tx('app_relay_tab') + ' <small>' + (aps.length ? '🟢 ' + aps.length : '–') + '</small></button>' + foldBtn('src') + '</div>';   // 1.18.0 📱
    var cur = many && tab.indexOf('ha:') === 0 ? svs.filter(function (v) { return 'ha:' + v.id === tab; })[0] : null;
    if (folded('src')) return '<div class="hal-srcbox folded">' + bar + '</div>';   // 1.17.1 접으면 탭 줄만
    return '<div class="hal-srcbox">' + bar + (tab === 'ap' ? apCard(aps) : tab === 'st' ? stCard() : tab === 'mt' ? mtCard(mts) : tab === 'mq' ? mqCard(mqs) : haCard(cur ? ha.filter(function (x) { return (x.ha_server || '') === cur.id; }) : ha, cur)) + '</div>';
  }
  /** 1.18.0 📱 앱 중계 — 설명 · 중계하는 폰 (프린터 · MQTT 센서 · 집 밖) */
  function apCard(aps) {
    var live = aps.filter(function (p) { return !p.away && p.at && agoMin(p.at) < 15; }).length;
    var pill = aps.length ? (live ? tx('connected_5') + (live > 1 ? ' ' + live : '') + '</span>' : tx('disconnected_4') + (aps.length - live) + '</span>') : tx('not_connected');
    var list = aps.map(function (p) {
      var on = !p.away && p.at && agoMin(p.at) < 15;
      return '<div class="hal-hachip' + (on ? '' : ' off') + '" style="cursor:default;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center"><span class="hal-dot ' + (on ? 'on' : 'off') + '"></span><b>' + esc(p.name) + '</b><small>' +
        (p.away ? tx('app_relay_away') : p.at ? agoText(p.at) : '') + '</small>' +
        (p.printers.length ? '<small>' + tx('app_relay_printers') + ' ' + p.printers.map(esc).join(' · ') + '</small>' : '') +
        (p.iot ? '<small>' + tx('app_relay_sensors') + '</small>' : '') + '</div>';
    }).join('');
    return '<section class="hal-stc mq"><header class="hal-stc-h"><span class="hal-stc-logo mq" aria-hidden="true" style="font-size:22px;display:grid;place-items:center">📱' + tx('app_relay_card') + pill + '</header>' +
      (aps.length ? '<h4 style="margin:8px 0 6px">' + tx('app_relay_phones') + '</h4><div class="hal-stc-devs ha" style="display:grid;gap:6px">' + list + '</div>' : tx('app_relay_none')) +
      tx('app_relay_how') + tx('trader_how') + '</section>';
  }
  function agoMin(at) { var t = new Date(String(at).replace(' ', 'T')), n = new Date(String(S.d.now || '').replace(' ', 'T')); return isNaN(t) || isNaN(n) ? 9999 : (n - t) / 60000; }
  /** 🏠 Home Assistant 로 이은 센서 — HA 의 「3DSSync」 통합이 고른 것 (누르면 고치기) */
  function haCard(ha, srv) {   // 1.8.0 srv = 탭으로 고른 HA 서버
    var on = ha.filter(function (x) { return !x.stale && !x.never; }).length, off = ha.filter(function (x) { return x.stale && !x.never; }).length;
    var pill = ha.length ? (off ? tx('disconnected_4') + off + '</span>' : on ? tx('connected_5') + (on > 1 ? ' ' + on : '') + '</span>' : tx('waiting_for_values_3')) : tx('not_connected');
    var head = '<header class="hal-stc-h"><span class="hal-stc-logo ha" aria-hidden="true">' + haLogo() + '</span><div><h2>' + (srv ? '🏠 ' + esc(srv.label) : 'Home Assistant') + tx('temp_humidity_sensors_printer') + pill + '</header>';
    var chips = ha.map(function (x) {
      var c = capsOf(x), live = !x.stale && !x.never, v = [];
      if (c.temp && x.temp != null) v.push(x.temp + '°'); if (c.hum && x.humidity != null) v.push(x.humidity + '%'); if (c.state) v.push(x.is_on ? tx('running') : tx('idle'));
      return '<button type="button" class="hal-hachip' + (live ? '' : ' off') + '"' + (x.perm === 'view' ? '' : ' data-edit="' + x.id + '"') + ' title="' + esc(x.name + ' · ' + (x.where || tx('waiting_area_2')) + ' · ' + (x.never ? tx('waiting_for_values_4') : agoText(x.seen))) + '"><span class="hal-dot ' + (x.never ? 'wait' : live ? 'on' : 'off') + '"></span>' + ICON[x.target] + ' ' + esc(x.name) + (v.length ? '<small>' + esc(v.join(' · ')) + '</small>' : '') + '</button>';
    }).join('');
    return '<section class="hal-stc ha">' + head + (ha.length ? '<div class="hal-stc-devs ha">' + chips + '</div>'
      : tx('no_sensors_linked_via')) +
      tx('connect_device_how_to') +
      tx('to_add_or_remove');
  }
  /** 1.10.0 🧩 Matter — 집 안 Matter 서버에 붙은 「3ds Matter 연결」 프로그램이 보낸 온습도 (애플 홈 · 구글 홈 센서를 「다른 앱과 공유」로) */
  function mtCard(xs) {
    var on = xs.filter(function (x) { return !x.stale && !x.never; }).length, off = xs.filter(function (x) { return x.stale && !x.never; }).length;
    var pill = xs.length ? (off ? tx('disconnected_4') + off + '</span>' : on ? tx('connected_5') + (on > 1 ? ' ' + on : '') + '</span>' : tx('waiting_for_values_3')) : tx('not_connected');
    var chips = xs.map(function (x) {
      var live = !x.stale && !x.never, v = [];
      if (x.temp != null) v.push(x.temp + '°'); if (x.humidity != null) v.push(x.humidity + '%');
      return '<button type="button" class="hal-hachip' + (live ? '' : ' off') + '"' + (x.perm === 'view' ? '' : ' data-edit="' + x.id + '"') + ' title="' + esc(x.name + ' · ' + (x.where || tx('waiting_area_2')) + ' · ' + (x.never ? tx('waiting_for_values_4') : agoText(x.seen))) + '"><span class="hal-dot ' + (x.never ? 'wait' : live ? 'on' : 'off') + '"></span>' + ICON[x.target] + ' ' + esc(x.name) + (v.length ? '<small>' + esc(v.join(' · ')) + '</small>' : '') + '</button>';
    }).join('');
    return '<section class="hal-stc mt"><header class="hal-stc-h"><span class="hal-stc-logo mt" aria-hidden="true">' + mtLogo() + tx('matter_3ds_link_the') + pill + '</header>' +
      (xs.length ? '<div class="hal-stc-devs ha">' + chips + tx('install_on_another_device') + mtWin() + '</details>' : tx('no_sensors_linked_via_2') + mtWin()) +
      tx('create_manually_how_to') + MT_REPO + tx('readme_target_blank_rel');
  }
  /* ── 1.15.0 📨 MQTT 중계 — 집 안 MQTT 브로커(Mosquitto · HA 의 Mosquitto 애드온)의 온습도 토픽 (Zigbee2MQTT · Tasmota · Shelly · ESPHome) → 「3ds MQTT 중계」 → 사이트
   *  브로커 주소 · 포트 · 계정 · 토픽은 여기서 (비밀번호는 사이트에 암호화 · 중계가 연결 코드로 받아 감) · 중계가 찾은 토픽에서 「➕ 받기」를 누른 것만 기기로 */
  function mqLogo(cls) { return '<svg class="hal-stl hal-mql' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M3.5 20.5A17 17 0 0 1 20.5 3.5M3.5 14.5A11 11 0 0 1 14.5 3.5M3.5 8.5a5 5 0 0 1 5-5"/><circle cx="18" cy="18" r="3" fill="currentColor"/></svg>'; }
  function mqOs() { var v = pref('mqos', ''); return v === 'win' || v === 'sh' ? v : mtOs(); }
  function mqLine(os) { var L = S.d.link || {}, sh = (os || mqOs()) === 'sh', u = (L.site || location.origin) + API + '/mq/' + (L.code || '') + (sh ? '.sh' : '.ps1'); return sh ? 'curl -fsSL "' + u + '" | bash' : 'irm "' + u + '" | iex'; }
  function mqWin(os) {
    os = os || mqOs();
    var sh = os === 'sh';
    return '<section class="hal-sec hal-mtwin hal-mqwin" data-mqos="' + os + '"><h4>' + mqLogo() + tx('relay_install_one_line') +
      '<div class="hal-seg hal-mtos" role="tablist"><button type="button" role="tab" data-mq-os="win" class="' + (sh ? '' : 'on') + '" aria-selected="' + !sh + tx('windows_button_type_button_2') + (sh ? 'on' : '') + '" aria-selected="' + sh + tx('linux_mac_raspberry_pi') +
      '<div class="hal-copy"><span>' + (sh ? tx('terminal') : 'PowerShell') + '</span><code data-mq-line>' + esc(mqLine(os)) + tx('copy_new_2') +
      '<ol class="hal-stc-steps"><li><em>1</em>' + (sh ? tx('open_a_terminal_ssh_2') : tx('start_open_powershell')) + tx('s_2_paste_and_press_2') +
      '<p class="hal-hint">' + (sh ? tx('linux_mac_receive_mqtt') : tx('if_you_only_use')) + tx('on_an_always_on_2');
  }
  function mqWinBind(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-mq-cp]'), function (b) { b.onclick = function () { var box = b.closest('.hal-mqwin'); copy(mqLine(box && box.getAttribute('data-mqos')), b); }; });
    Array.prototype.forEach.call(root.querySelectorAll('[data-mq-os]'), function (b) { b.onclick = function () { var os = b.getAttribute('data-mq-os'), box = b.closest('.hal-mqwin'); setPref('mqos', os); if (!box) return; var t = document.createElement('div'); t.innerHTML = mqWin(os); var nb = t.firstChild; box.parentNode.replaceChild(nb, box); mqWinBind(nb.parentNode); }; });
  }
  /* 1.16.6 🔑 연결 코드 새로 만들기 — 한 줄이 보이는 곳마다 (🧩 Matter · 📨 MQTT · BT 중계 · 🏠 HA 통합이 같은 코드를 씀) */
  function rlAny(b) {
    if (!confirm(tx('create_a_new_link'))) return;
    b.disabled = true;
    api('POST', '/link/rotate', {}).then(function (r) {
      toast(r.message + tx('copy_the_new_line')); S.d = r.data.overview; draw();
      Array.prototype.forEach.call(document.querySelectorAll('[data-mq-line]'), function (c) { var w = c.closest('.hal-mqwin'); c.textContent = mqLine(w && w.getAttribute('data-mqos')); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-mt-line]'), function (c) { var w = c.closest('.hal-mtwin'), i = w && w.querySelector('[data-mt-addr]'); c.textContent = mtLine(i ? i.value : null, w && w.getAttribute('data-mtos')); });
      b.disabled = false;
    }).catch(function (e) { b.disabled = false; fail(e); });
  }
  if (!window.__halRl) { window.__halRl = true; document.addEventListener('click', function (e) { var b = e.target.closest('[data-rl-any]'); if (b) { e.preventDefault(); rlAny(b); } }); }
  function mqLive(r) { return !!(r && r.at && new Date(S.d.now.replace(' ', 'T')) - new Date(String(r.at).replace(' ', 'T')) < 180000); }   // 중계는 30초마다 알림 — 3분 넘게 없으면 꺼진 것
  function mqBad(r) { return !!(r && r.broker && r.broker !== 'ok' && r.broker !== 'start' && r.broker !== 'none'); }   // none = 브로커 없이 블루투스만 (1.16.0)
  function mqCard(xs) {
    var M = S.d.mqtt || { seen: [], topics: ['#'], port: 1883, host: '' }, R = M.relay, live = mqLive(R), bad = live && mqBad(R), ble = live && R.ble === 'on';
    var pill = !R ? tx('not_connected') : !live ? tx('relay_off') : bad ? tx('check_broker') : tx('connected_5') + (M.picked ? ' ' + M.picked : '') + '</span>';
    // 1.16.5 처음인 사람 — 블루투스는 한 줄이면 끝 · MQTT 브로커는 있을 때만 (주소 칸을 먼저 보이지 않음)
    var brk = !M.saved ? tx('mqtt_broker_only_if')
      : '<div class="hal-mqb"><div><b>📮 ' + esc(M.host || tx('no_broker_address')) + ':' + esc(M.port) + '</b><small>' + (M.user ? '👤 ' + esc(M.user) + (M.has_pass ? tx('password') : '') : tx('no_account')) + (M.tls ? ' · 🔒 TLS' : '') + tx('topics') + esc(M.topics.join('  ')) + tx('broker_settings');
    brk += (R ? '<p class="hal-hint hal-mqr">💻 <b>' + esc(R.name || tx('relay')) + '</b> · ' + (live ? '🟢 ' : '⚪ ') + esc(agoText(R.at)) + (bad ? ' · <b class="hal-mqerr">⚠️ ' + esc(R.broker) + '</b>' : '') + (R.ble ? tx('bluetooth_beta') + (R.ble === 'on' ? (live ? tx('listening') : tx('off')) : R.ble === 'off' ? tx('none_2') : '<b class="hal-mqerr">⚠️ ' + esc(R.ble) + '</b>') : '') + '</p>' : '');
    // 1.15.1 찾은 센서는 단추(칩) — 누르면 받기 · 받는 것(✅)을 누르면 그만 받기. 토픽 · 언제는 단추에 올리면
    var chip = function (s) {
      var on = s.device_id != null, dv = on ? find(s.device_id) : null, v = [];
      if (s.temperature != null) v.push(s.temperature + '°'); if (s.humidity != null) v.push(s.humidity + '%');
      return '<button type="button" class="hal-mqc' + (on ? ' on' : '') + '" ' + (on ? 'data-mq-off' : 'data-mq-on') + '="' + esc(s.key) + '" aria-pressed="' + on + '" title="' + esc(s.key + ' · ' + agoText(s.at) + (on ? tx('click_to_stop_receiving') : tx('click_to_receive'))) + '"><i aria-hidden="true">' + (on ? '✅' : '➕') + (s.key.indexOf('ble/') === 0 ? '📶' : '') + '</i>' + esc(dv ? dv.name : s.name) + (s.key.indexOf('ble/') === 0 ? '<em class="hal-beta sm">🧪</em>' : '') + (v.length ? '<small>' + esc(v.join(' · ')) + '</small>' : '') + '</button>';
    };
    var seen = M.seen || [];
    var list = seen.length ? tx('found_sensors') + seen.length + tx('click_to_receive_waiting') + seen.map(chip).join('') + '</div>'
      : '<p class="hal-hint">' + (R && live ? tx('the_relay_is_searching') : tx('no_sensors_found_yet')) + '</p>';
    return '<section class="hal-stc mq"><header class="hal-stc-h"><span class="hal-stc-logo mq" aria-hidden="true">' + mqLogo() + tx('mqtt_bt_3ds_relay_2') + pill + '</header>' +
      (!M.saved && !R ? list + mqWin() + brk : brk + list + (R ? tx('install_on_another_device_2') + mqWin() + '</details>' : mqWin())) +   // 1.16.5 처음이면 한 줄 설치 먼저 · 브로커는 맨 아래 (있을 때만)
      tx('how_to_connect_2');
  }
  /** 1.16.0 ❓ 연결 방법 › MQTT · 📶 블루투스 — 그림 단추 (스크롤 없이) */
  function guideMq() {
    var T = [['win', '💻', tx('one_line_install'), tx('windows_linux_mac')], ['app', '📱', tx('phone_app_relay'), tx('android_no_pc')], ['trader', '🏢', tx('trader_tile'), tx('trader_tile_sub')], ['broker', '⚙️', tx('broker_settings_2'), tx('address_account_topics')], ['pick', '🔎', tx('choose_sensors'), tx('pill_buttons')], ['ble', '📶', tx('bluetooth_thermo_hygrometers'), tx('beta_via_windows_relay')], ['topic', '🧾', tx('topic_examples'), 'Zigbee2MQTT · Tasmota …'], ['off', '🔌', tx('turn_off'), tx('relay_sensors')]];
    var P = {
      win: mqWin(),
      app: tx('app_relay_guide'),   // 1.17.9
      trader: '<section class="hal-sec">' + tx('trader_how') + '</section>',   // 1.19.6 🏢
      broker: tx('broker_settings_mqtt_card') +
        tx('address_port_ip_of') +
        tx('account_same_as_what') +
        tx('topics_means_everything_only') +
        tx('no_broker_leave_it'),
      pick: tx('choose_sensors_2') +
        tx('pill_button_click_to') +
        tx('receiving_click_to_stop') +
        tx('mark_a_thermo_hygrometer') +
        tx('delete_device_card_delete'),
      ble: tx('bluetooth_thermo_hygrometers_beta') +
        tx('supported_xiaomi_lywsd03mmc_mho') +
        tx('xiaomi_stock_firmware_values') +
        tx('requirements_windows_10_11') +
        tx('linux_mac_mqtt_only') +
        tx('beta_signal_formats_are'),
      topic: tx('topic_examples_broker_settings') +
        '<div><b>Zigbee2MQTT</b><code>zigbee2mqtt/+</code></div><div><b>Tasmota</b><code>tele/+/SENSOR</code></div><div><b>Shelly</b><code>shellies/#</code></div>' +
        tx('esphome_lt_name_gt'),
      off: tx('turn_off_only_what') +
        tx('turn_off_the_relay') +
        tx('stop_receiving_one_sensor') +
        tx('delete_a_site_device')
    };
    return tx('sensor_mqtt_broker_bluetooth') +
      '<div class="hal-mtg-tiles">' + T.map(function (t) { return '<button type="button" class="hal-mtg-tile' + (t[0] === 'win' ? ' main' : '') + '" data-mtg="' + t[0] + '"><i aria-hidden="true">' + t[1] + '</i><b>' + t[2] + '</b><small>' + t[3] + '</small></button>'; }).join('') + '</div>' +
      Object.keys(P).map(function (k) { return '<div class="hal-mtg-pane" data-mtg-pane="' + k + tx('hidden_back_to_start') + P[k] + '</div>'; }).join('') + '</div>';
  }
  function mqSetBox() {
    var M = S.d.mqtt || { topics: ['#'], port: 1883, host: '' };
    var html = tx('broker_address_ip_or') + esc(M.host) + tx('placeholder_e_g_192_2') +
        tx('port_usually_1883_tls') + esc(M.port || 1883) + '"></label></div>' +
        '<label class="hal-chk"><input type="checkbox" name="tls"' + (M.tls ? ' checked' : '') + tx('connect_over_tls_mqtts') +
      tx('account_leave_blank_if') + esc(M.user || '') + '" autocapitalize="off" autocomplete="off" spellcheck="false"></label>' +
        tx('password_input_name_pass') + (M.has_pass ? tx('unchanged_enter_only_to') : tx('leave_blank_if_none')) + '" autocomplete="new-password"></label></div>' +
        (M.has_pass ? tx('clear_the_saved_password') : '') +
        tx('the_password_is_stored') +
      tx('topics_to_receive_one') + esc((M.topics || ['#']).join('\n')) + '</textarea>' +
        tx('everything_e_g_zigbee2mqtt');
    var ov = modal(mqLogo() + tx('mqtt_broker_settings'), html, { ok: tx('save'), onSave: function (o) {
      var v = {}; Array.prototype.forEach.call(o.querySelectorAll('[name]'), function (i) { v[i.name] = i.type === 'checkbox' ? i.checked : i.value.trim(); });
      if (!v.pass) delete v.pass;
      return api('PUT', '/mqtt', v).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); });
    } });
    var tls = ov.querySelector('[name=tls]'), port = ov.querySelector('[name=port]');
    tls.onchange = function () { if (tls.checked && port.value === '1883') port.value = '8883'; else if (!tls.checked && port.value === '8883') port.value = '1883'; };
  }
  function mqBind() {
    qa('[data-mq-set]').forEach(function (b) { b.onclick = mqSetBox; });
    qa('[data-guide-mq]').forEach(function (b) { b.onclick = function () { guideBox('mq'); }; });   // 1.16.0
    qa('[data-mq-on],[data-mq-off]').forEach(function (b) {
      b.onclick = function () {
        var on = b.hasAttribute('data-mq-on'), k = b.getAttribute(on ? 'data-mq-on' : 'data-mq-off');
        if (!on && !confirm(tx('stop_receiving_this_topic'))) return;
        b.disabled = true;
        api('POST', '/mqtt/pick', { key: k, on: on }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); }).catch(function (e) { b.disabled = false; fail(e); });
      };
    });
    mqWinBind(S.root);
  }
  function stCard() {
    var T = S.d.smartthings; if (!T) return '';
    var ins = T.installs || [], oa = ins.filter(function (x) { return x.mode === 'oauth'; }), old = ins.filter(function (x) { return x.mode !== 'oauth'; });
    var live = ins.filter(function (x) { return x.status === 'active'; }).length, bad = ins.filter(function (x) { return x.status === 'error' || x.last_error; }).length, todo = ins.filter(function (x) { return x.status === 'choose'; }).length;
    var pill = ins.length ? (bad ? tx('needs_attention_2') : live ? tx('connected_5') + (live > 1 ? ' ' + live : '') + '</span>' : todo ? tx('choose_sensors_3') : tx('matching')) : tx('not_connected_2');
    var head = '<header class="hal-stc-h"><span class="hal-stc-logo" aria-hidden="true">' + stLogo() + tx('smartthings_values_from_samsung') + pill + '</header>';
    if (!ins.length && !T.oauth && !(T.ready && T.code_flow)) return '<section class="hal-stc off">' + head + tx('the_admin_hasn_t');
    // 로그인 연결 — 아직 안 이었으면 큰 단추 하나
    var go = !oa.length && T.oauth ? tx('s_1_sign_in_with') +
      tx('connect_smartthings_illustrated_guide') +
      tx('the_site_only_reads') + stPay() + '</div>' : '';
    var list = oa.map(function (x) {
      var s = ST_STATUS[x.status] || ['', x.status], names = (x.site_devices || []).map(find).filter(Boolean);
      return '<article class="hal-stc-i"><div class="hal-stc-ih"><div><b>📍 ' + esc(x.location || tx('smartthings_location')) + '</b><small><span class="hal-dot ' + s[0] + '"></span>' + s[1] + tx('sensors_4') + (x.picked || 0) + tx('s_2') + (x.last_event_at ? tx('last_value') + esc(agoText(x.last_event_at)) : '') + '</small></div>' +
        '<div class="hal-row">' + (x.status === 'active' || x.status === 'error' ? tx('reconnect') : '') + '<button type="button" class="hal-btn sm' + (x.status === 'choose' ? ' pri' : '') + '" data-st-pick="' + x.id + tx('choose_sensors_button_type') + x.id + tx('disconnect') +
        (x.last_error ? '<p class="hal-warn">' + esc(x.last_error) + (T.oauth ? tx('reconnect_2') : '') + '</p>' : '') +
        (names.length ? '<div class="hal-stc-devs">' + names.map(function (d) { return '<span>' + ICON[d.target] + ' ' + esc(d.name) + '</span>'; }).join('') + '</div>'
          : '<p class="hal-hint">' + (x.status === 'choose' ? tx('no_sensors_chosen_yet') : tx('waiting_for_sensor_values')) + '</p>') + '</article>';
    }).join('');
    var more = oa.length ? '<div class="hal-row hal-stc-more">' + (T.oauth ? tx('connect_another_location') : '') + tx('how_to_connect_3') : '';
    return '<section class="hal-stc">' + head + go + (list ? '<div class="hal-stc-list rows">' + list + '</div>' : '') + more + (go ? '' : stPay()) + stOld(T, old) + '</section>';
  }
  /* 0.2.0 예전 방식 — 연결 코드를 SmartThings 앱의 설정 화면에 적음 (SmartApp). 관리자가 켰거나(code_flow) 그렇게 이은 것이 있을 때만 */
  function stOld(T, ins) {
    if (!ins.length && !(T.ready && T.code_flow)) return '';
    var opts = tx('create_a_new_device') + S.d.devices.map(function (x) { return '<option value="' + x.id + '">' + ICON[x.target] + ' ' + esc(x.name) + '</option>'; }).join('');
    var code = !T.code_flow ? '' : T.code ? tx('link_code') + minsLeft(T.code.expires_at) + tx('min_left_single_use') + esc(T.code.code) + tx('attach_to_2') + esc(T.code.device_id ? ((find(T.code.device_id) || {}).name || '–') : tx('new_device_smartthings')) + tx('copy_new_3')
      : tx('device_to_pass_values') + opts + '</select></label><button type="button" class="hal-btn" data-st-new' + (T.ready ? '' : ' disabled') + tx('create_link_code');
    var list = ins.map(function (x) {
      var s = ST_STATUS[x.status] || ['', x.status];
      var sel = '<select data-st-relink="' + x.id + tx('aria_label_device_to') + (x.device_id ? '' : tx('choose_a_device')) + S.d.devices.map(function (d) { return '<option value="' + d.id + '"' + (d.id === x.device_id ? ' selected' : '') + '>' + ICON[d.target] + ' ' + esc(d.name) + '</option>'; }).join('') + '</select>';
      return '<article class="hal-stc-i"><div class="hal-stc-ih"><div><b>📍 ' + esc(x.location || tx('smartthings_location')) + '</b><small><span class="hal-dot ' + s[0] + '"></span>' + s[1] + tx('last_value') + esc(x.last_event_at ? agoText(x.last_event_at) : tx('none_yet')) + '</small></div><div class="hal-stc-to">→ ' + sel + '</div><button type="button" class="hal-btn sm danger" data-st-del="' + x.id + tx('disconnect_2') +
        (x.last_error ? '<p class="hal-warn">' + esc(x.last_error) + '</p>' : '') + (x.sensors.length ? sensList(x.sensors, 40) : tx('waiting_for_sensor_values_2')) + '</article>';
    }).join('');
    var how = !T.code_flow ? '' : tx('create_link_code_if') +
      tx('smartthings_app_automations_tab') +
      tx('enter_the_8_characters') +
      tx('the_link_code_can') + (T.code_min || 30) + tx('minutes_to_change_sensors');
    return '<details class="hal-stc-how"' + (ins.length ? ' open' : '') + tx('legacy_method_link_with') + code + (list ? '<div class="hal-stc-list">' + list + '</div>' : '') + how + '</details>';
  }
  /** 「🔗 SmartThings 연결하기」 — 로그인 주소를 받아 그리로 감 (돌아오면 route 가 이어서 함) */
  function stGo(btn) {
    if (btn) { btn.disabled = true; btn.textContent = tx('going_to_smartthings'); }
    api('POST', '/smartthings/oauth/start', {}).then(function (r) { location.href = r.data.url; }).catch(function (e) { fail(e); draw(); });
  }
  /* 1.4.2 🔄 다시 잇기 — 끊긴 SmartThings 기기를 지금 바로 (구독 다시 확인 · 지금 값 물어보기). 기다리는 동안 단추를 막음 */
  function revive(b) {
    qa('[data-revive]').forEach(function (x) { x.disabled = true; x.textContent = tx('reconnecting'); });
    api('POST', '/smartthings/revive', {}).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); })
      .catch(function (e) { fail(e); api('GET', '/me').then(function (r) { S.d = r.data; draw(); }).catch(function () { draw(); }); });
  }
  function stBind() {
    var root = q('.hal-stc'); if (!root) return;
    root.onclick = function (ev) {
      var t = ev.target, b;
      if ((b = t.closest('[data-st-go]'))) { stGo(b); return; }
      if ((b = t.closest('[data-st-pick]'))) { stPick(+b.getAttribute('data-st-pick')); return; }
      if (t.closest('[data-st-guide]')) { guideBox('st'); return; }
      if (t.closest('[data-st-copy]')) { copy(String(S.d.smartthings.code.code), t.closest('[data-st-copy]')); return; }
      if (t.closest('[data-st-new]')) { var sel = root.querySelector('[data-st-dev-new]'), dev = sel ? sel.value : (S.d.smartthings.code && S.d.smartthings.code.device_id) || ''; api('POST', '/smartthings/code', { device_id: dev ? +dev : null }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); }).catch(fail); return; }
      var del = t.closest('[data-st-del]'); if (del && confirm(tx('disconnect_smartthings_device_cards'))) api('DELETE', '/smartthings/installs/' + del.getAttribute('data-st-del')).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); }).catch(fail);
    };
    root.onchange = function (ev) {
      var s = ev.target.closest('[data-st-relink]'); if (!s || !s.value) return;
      api('PUT', '/smartthings/installs/' + s.getAttribute('data-st-relink'), { device_id: +s.value }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); }).catch(fail);
    };
  }
  /* 1.1.0 ⚙️ 센서 고르기 — 그 위치의 SmartThings 기기 가운데 받을 것을 체크. 센서 하나가 기기 카드 하나 (이름이 같은 카드가 있으면 거기에 · 없으면 새 카드) */
  var PK_ICON = { '온도': '🌡️', '습도': '💧', '전력': '🔌', '스위치': '💡', '열림': '🚪', '움직임': '🏃', '재실': '🏠', '누수': '💦', '밝기': '☀️', '전력량': '📈', '배터리': '🔋' };
  /* 1.2.0 붙일 곳 — 새 카드 · 🖨️ 내 프린터(프린터 라운지에 보임) · 이미 있는 카드. 프린터 라운지에서 넘어왔으면(S.pickPrinter) 그 프린터가 먼저 골라짐 */
  function stPick(id) {
    var want = S.pickPrinter || 0; S.pickPrinter = 0; try { sessionStorage.removeItem('hal:st:printer'); } catch (e) {}   // 한 번만 씀
    var data = null, ov = modal(tx('choose_smartthings_sensors'), tx('loading_devices_from_smartthings'), { ok: tx('save'), onSave: function (o) {
      var picks = Array.prototype.map.call(o.querySelectorAll('[data-pk]:checked'), function (c) { var to = o.querySelector('[data-pk-to="' + c.getAttribute('data-pk') + '"]'); var v = to ? to.value : ''; return { id: c.getAttribute('data-pk'), site_device_id: v && v.charAt(0) !== 'p' ? +v : null, printer_id: v.charAt(0) === 'p' ? +v.slice(2) : null }; });
      var w = o.querySelector('[data-pk-w]');
      return api('PUT', '/smartthings/installs/' + id + '/devices', { devices: picks, power_on_w: w && w.value !== '' ? +w.value : null }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); });
    } });
    ov.classList.add('wide');
    var body = ov.querySelector('.hal-modal-c'), ok = ov.querySelector('[data-ok]'); ok.disabled = true;
    var sync = function () {
      var n = 0; Array.prototype.forEach.call(ov.querySelectorAll('[data-pk]'), function (c) { c.closest('li').classList.toggle('on', c.checked); if (c.checked) n++; });
      var cnt = ov.querySelector('[data-pk-count]'); if (cnt) cnt.textContent = n ? n + tx('selected') : tx('none_selected');
      if (data) { ok.disabled = n > data.max; if (cnt && n > data.max) cnt.textContent = n + tx('up_to') + data.max + tx('can_be_selected'); }
    };
    api('GET', '/smartthings/installs/' + id + '/devices').then(function (r) {
      data = r.data; var D = data.devices, first = !D.some(function (x) { return x.picked; });
      if (!D.length) { body.innerHTML = tx('no_receivable_sensors_temperature'); return; }
      var P = S.d.printers || [], wantOk = want && P.some(function (p) { return p.id === want; });
      var wp = wantOk ? P.filter(function (p) { return p.id === want; })[0] : null;
      var opts = function (x) {
        // 이미 붙인 카드 → 프린터 라운지에서 고른 프린터(플러그 · 온습도계) → 이름이 같은 프린터 → 이름이 같은 카드 → 새 카드
        var cur = x.resave && x.suggest_printer ? 'p:' + x.suggest_printer : x.site_device_id ? String(x.site_device_id) : wantOk && x.kind !== 'other' ? 'p:' + want : x.suggest_printer ? 'p:' + x.suggest_printer : x.suggest ? String(x.suggest) : '';
        return tx('as_a_new_device') +
          (P.length ? tx('s_22') + P.map(function (p) { return '<option value="p:' + p.id + '"' + (cur === 'p:' + p.id ? ' selected' : '') + '>🖨️ ' + esc(p.name) + '</option>'; }).join('') + '</optgroup>' : '') +
          (S.d.devices.length ? tx('s_23') + S.d.devices.map(function (d) { return '<option value="' + d.id + '"' + (cur === String(d.id) ? ' selected' : '') + '>' + ICON[d.target] + ' ' + esc(d.name) + '</option>'; }).join('') + '</optgroup>' : '');
      };
      body.innerHTML = (wp ? tx('from_the_printer_lounge') + esc(wp.name) + tx('check_the_plugs_thermo') : '') +
        '<p class="hal-guide-top">📍 <b>' + esc(data.location || 'SmartThings') + tx('sensors_check_the_ones') +
        tx('all_thermo_hygrometers_clear') +
        '<ul class="hal-pk">' + D.map(function (x) {
          var on = x.picked || (first && !wp && x.kind === 'env'), vals = x.values.map(function (v) { return esc(v.what) + (v.value !== '' ? ' <b>' + esc(v.value) + '</b>' : ''); }).join(' · ');
          return '<li class="' + (on ? 'on' : '') + '" data-kind="' + esc(x.kind) + '"><label class="hal-pk-m"><input type="checkbox" data-pk="' + esc(x.id) + '"' + (on ? ' checked' : '') + '><span class="hal-ico">' + (x.kind === 'printer' ? '🖨️' : x.kind === 'power' ? '🔌' : PK_ICON[(x.values[0] || {}).what] || '📟') + '</span><span class="hal-pk-t"><b>' + esc(x.label) + (x.kind === 'printer' ? tx('printer_device') : '') + '</b><small>' + vals + '</small>' +
              (x.kind === 'printer' ? '<small class="hal-pk-note">' + (x.resave ? tx('receiving_the_legacy_way') : '') + tx('attach_it_to_my') : '') + '</span></label>' +
            tx('attach_to_select_data') + esc(x.id) + '">' + opts(x) + '</select></label></li>';
        }).join('') + '</ul>' +
        (D.some(function (x) { return x.values.some(function (v) { return v.what === '전력'; }); }) ? tx('running_when_the_plug') + esc(data.power_on_w) + '"></label></section>' : '') +
        (P.length ? tx('to_show_it_in') : '') +
        tx('the_site_only_reads_2') + (data.room < 3 ? tx('you_can_create') + data.room + tx('more_new_device_cards') : '') + '</p>' + stPay();
      ok.disabled = false; sync();
    }).catch(function (e) { body.innerHTML = '<div class="hal-empty sm">' + esc(e.message) + '</div>'; });
    ov.addEventListener('change', sync);
    ov.addEventListener('click', function (ev) {
      var env = ev.target.closest('[data-pk-env]'), none = ev.target.closest('[data-pk-none]'); if (!env && !none) return;
      Array.prototype.forEach.call(ov.querySelectorAll('[data-pk]'), function (c) { if (none) c.checked = false; else if (c.closest('li').getAttribute('data-kind') === 'env') c.checked = true; }); sync();
    });
  }

  function copy(txt, btn) {
    var label = btn.textContent, done = function () { btn.textContent = tx('copied'); setTimeout(function () { btn.textContent = label; }, 1600); };
    var fallback = function () { var ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast(tx('couldn_t_copy_please'), true); } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
  }
  /* 0.1.8 ❓ 연결 방법 — 한 걸음씩, 화면 그림에 누를 곳을 빨갛게.
   *   그림은 사진이 아니라 화면을 본떠 그린 것 (가볍고 · 다크 테마에도 맞고 · 화면이 조금 바뀌어도 뜻이 통하게). 실제 Home Assistant · SmartThings 화면은 버전에 따라 조금 다를 수 있음
   *   1.1.0 📡 SmartThings 연결 방법도 같은 모양으로 — 위쪽 탭으로 고름 */
  function shot(bar, html, kind) { return '<div class="hal-shot' + (kind ? ' ' + kind : '') + '" aria-hidden="true"><div class="hal-shot-bar"><i></i><i></i><i></i><span>' + bar + '</span></div><div class="hal-shot-b">' + html + '</div></div>'; }
  function hl(html, n) { return '<span class="hal-hl">' + html + (n ? '<b class="hal-hl-n">' + n + '</b>' : '') + '</span>'; }
  function fakeBtn(t, cls) { return '<span class="hal-fake-btn ' + (cls || '') + '">' + t + '</span>'; }
  function fakeFld(label, val) { return '<div class="hal-fake-fld">' + (label ? '<small>' + label + '</small>' : '') + '<span>' + val + '</span></div>'; }
  function fakeChk(on, t) { return '<div class="hal-fake-chk"><i class="' + (on ? 'on' : '') + '">' + (on ? '✓' : '') + '</i>' + t + '</div>'; }
  /* 1.16.0 스크롤 없이 — 걸음마다 그림 단추 (누르면 그 걸음 하나만 · ◀ 이전 · 다음 ▶ · ◀ 처음으로). extra = [[키, 아이콘, 이름, 작은 글, 본문]] */
  var CNUM = '①②③④⑤⑥⑦⑧⑨';
  function guideSteps(steps, extra) {
    extra = extra || [];
    var n = steps.length, plain = function (h) { return String(h).replace(/<small>[\s\S]*?<\/small>/g, '').replace(/<[^>]+>/g, '').trim(); };
    var tiles = steps.map(function (s, i) { return ['s' + i, CNUM.charAt(i), plain(s[0]), '']; }).concat(extra.map(function (x) { return [x[0], x[1], x[2], x[3] || '']; }));
    var nav = function (i) { return tx('back_to_start') + (i > 0 ? '<button type="button" class="hal-btn sm" data-mtg="s' + (i - 1) + '">◀ ' + CNUM.charAt(i - 1) + '</button>' : '') + (i < n - 1 ? '<button type="button" class="hal-btn sm pri" data-mtg="s' + (i + 1) + tx('next') + CNUM.charAt(i + 1) + ' ▶</button>' : '') + '</div>'; };
    var back = tx('back_to_start_2');
    return '<div class="hal-mtg hal-mtg-steps"><div class="hal-mtg-tiles">' + tiles.map(function (t, i) { return '<button type="button" class="hal-mtg-tile' + (i === 0 ? ' main' : '') + (t[0].charAt(0) === 's' && /^s\d+$/.test(t[0]) ? ' step' : '') + '" data-mtg="' + t[0] + '"><i aria-hidden="true">' + t[1] + '</i><b>' + esc(t[2]) + '</b>' + (t[3] ? '<small>' + t[3] + '</small>' : '') + '</button>'; }).join('') + '</div>' +
      steps.map(function (s, i) { return '<div class="hal-mtg-pane" data-mtg-pane="s' + i + '" hidden><ol class="hal-guide one"><li><div class="hal-guide-t"><em>' + (i + 1) + '</em><div><b>' + s[0] + '</b><p>' + s[1] + '</p></div></div>' + s[2] + '</li></ol>' + nav(i) + '</div>'; }).join('') +
      extra.map(function (x) { return '<div class="hal-mtg-pane" data-mtg-pane="' + x[0] + '" hidden>' + back + x[4] + '</div>'; }).join('') + '</div>';
  }
  function guideHa() {
    var L = S.d.link, code = String(L.code || '').slice(0, 6) + '…', btn = function (t, cls) { return '<span class="hal-fake-btn ' + (cls || '') + '">' + t + '</span>'; }, row = function (a, b) { return '<div class="hal-fake-row"><span>' + a + '</span>' + b + '</div>'; };
    var fld = function (label, val) { return '<div class="hal-fake-fld"><small>' + label + '</small><span>' + val + '</span></div>'; }, chk = function (on, t) { return '<div class="hal-fake-chk"><i class="' + (on ? 'on' : '') + '">' + (on ? '✓' : '') + '</i>' + t + '</div>'; };
    var steps = [
      [tx('add_the_repository_to'), tx('in_hacs_top_right'),
        shot('Home Assistant · HACS', '<div class="hal-fake-row"><b class="hal-fake-t">HACS</b>' + hl('<span class="hal-fake-ico">⋮</span>', 1) + '</div>' + hl(tx('custom_repositories'), 2) + hl(fld(tx('repository'), 'https://github.com/' + esc(L.repo)) + fld(tx('type'), tx('integration')), 3) + '<div class="hal-fake-end">' + hl(btn(tx('add'), 'pri'), 4) + '</div>', 'ha')],
      [tx('download_and_restart'), tx('open_3ds_click_download'),
        shot('Home Assistant · HACS · 3DSSync', '<div class="hal-fake-repo"><span class="hal-fake-logo">3DS</span><div><b>3DSSync</b><small>' + esc(L.repo) + tx('integration_sends_temp_humidity') + hl(btn(tx('download'), 'pri'), 1) + tx('settings_system') + hl(tx('restart'), 2) + '</div>', 'ha')],
      [tx('find_3ds_in_add'), tx('settings_devices_services_bottom'),
        shot(tx('home_assistant_devices_services'), tx('integrations') + hl('<div class="hal-fake-fld"><span>🔍 3DSSync</span></div>', 2) + hl(tx('s_3ds_3ds_temp_humidity'), 3) + '<div class="hal-fake-end">' + hl(btn(tx('add_integration'), 'pri'), 1) + '</div>', 'ha')],
      [tx('paste_the_site_url'), tx('click_connect_device_on'),
        shot(tx('site_home_assistant'), row(tx('site_url'), '<code>' + esc(L.site) + '</code>' + hl(btn(tx('copy'), 'pri sm'), 1)) + row(tx('link_code_2'), '<code>' + esc(code) + '</code>' + hl(btn(tx('copy'), 'pri sm'), 2)) + '<hr>' + hl(fld(tx('site_url'), esc(L.site)) + fld(tx('link_code_2'), '●●●●●●●●●●●●'), 3) + '<div class="hal-fake-end">' + hl(btn(tx('ok'), 'pri'), 4) + '</div>', 'ha')],
      [tx('auto_detect_and_connect'), tx('choose_auto_detect_and'),
        shot('Home Assistant · 3DSSync', tx('what_to_attach_to') + hl(tx('auto_detect_and_connect_2'), 1) + tx('my_printer_one_by') + hl(chk(1, tx('living_room_bambu_lab')) + chk(1, tx('dry_box_dry_box')) + chk(0, tx('living_room_humidity_new')), 2) + '<div class="hal-fake-end">' + hl(btn(tx('ok'), 'pri'), 3) + '</div>', 'ha')],
      [tx('attach_printers_equipment_that'), tx('if_names_differ_and'),
        shot(tx('home_assistant_3ds_one'), hl(fld(tx('device_optional'), 'Bambu Lab P1S'), 1) + tx('choose_sensors_found_ones') + hl(fld(tx('status'), 'sensor.p1s_print_status') + fld(tx('progress'), 'sensor.p1s_print_progress') + fld(tx('camera'), 'camera.p1s_camera'), 2) + '<div class="hal-fake-end">' + hl(btn(tx('ok'), 'pri'), 3) + '</div>', 'ha')],
      [tx('finish_on_the_site'), tx('it_appears_on_this'),
        shot(tx('site_iot_link_inventory'), tx('dry_box') + hl('<span class="hal-fake-ico">✏️</span>', 2) + '</div><div class="hal-fake-vals"><span>💧 <b>32.5</b>%</span><span>🌡️ <b>23.4</b>°C</span></div>' + hl(tx('just_now_2'), 1) + '</div>' + hl(tx('storage_location_where_the'), 3) + tx('dry_in_12_days'))]
    ];
    var more = tx('good_to_know') +
      tx('for_printers_company_equipment') +
      tx('to_add_or_remove_2') +
      tx('to_move_an_attached') +
      tx('if_it_doesn_t') +
      tx('if_you_don_t') +
      tx('illustrations_are_mock_ups');
    return tx('ha_direct') + tx('it_takes_about_5') + guideSteps(steps, [['more', '💡', tx('good_to_know_2'), '', more]]);
  }
  /* 1.1.0 📡 SmartThings 연결 방법 — 로그인 연결 (연결하기 → 삼성 계정 로그인 → 허용 → 센서 고르기 → 카드) */
  function guideSt() {
    var btn = fakeBtn, fld = fakeFld, chk = fakeChk, site = esc(location.hostname || tx('site'));
    var card = '<div class="hal-fake-row"><span class="hal-fake-repo"><span class="hal-fake-logo st">' + stLogo() + tx('smartthings_thermo_hygrometers_plugs');
    var steps = [
      [tx('click_connect_smartthings'), tx('it_s_the_button'),
        shot(tx('site_iot_link'), card + '<div class="hal-fake-end">' + hl(btn(tx('connect_smartthings'), 'pri'), 1) + '</div>')],
      [tx('sign_in_with_your'), tx('sign_in_with_the'),
        shot(tx('samsung_account_sign_in'), '<b class="hal-fake-t">Samsung account</b>' + hl(fld(tx('email_or_phone_number'), 'me@example.com') + fld(tx('password_2'), '●●●●●●●●●●'), 1) + '<div class="hal-fake-end">' + hl(btn(tx('sign_in'), 'pri'), 2) + '</div>', 'st')],
      [tx('choose_a_location_and'), tx('choose_the_location_with'),
        shot(tx('smartthings_allow_permissions'), '<b class="hal-fake-t">「' + site + tx('is_requesting') + chk(1, tx('view_devices_read_values')) + chk(1, tx('view_locations_name_temperature')) + hl(fld(tx('location'), tx('my_home')), 1) + '<div class="hal-fake-end">' + btn(tx('cancel')) + ' ' + hl(btn(tx('allow'), 'pri'), 2) + '</div>', 'st')],
      [tx('choose_sensors_to_receive'), tx('back_on_the_site'),
        shot(tx('site_choose_sensors'), hl(chk(1, tx('dry_box_thermo_hygrometer')) + chk(1, tx('dryer_plug_power_120')) + chk(0, tx('front_door_open_closed')), 1) + '<div class="hal-fake-end">' + hl(btn(tx('save'), 'pri'), 2) + '</div>')],
      [tx('done_set_alert_thresholds'), tx('values_appear_on_the'),
        shot(tx('site_iot_link'), tx('dry_box_thermo_hygrometer_2') + stLogo() + ' SmartThings</span></span>' + hl('<span class="hal-fake-ico">✏️</span>', 2) + '</div><div class="hal-fake-vals"><span>💧 <b>32</b>%</span><span>🌡️ <b>23.4</b>°C</span></div>' + hl(tx('just_now_2'), 1) + '</div>' + hl(fld(tx('humidity_above'), '40') + fld(tx('what_to_attach_to_2'), tx('filament_resin_storage_box')), 3))]
    ];
    /* 1.3.0 🖨️ 프린터에 쓸 수 있는 것 — SmartThings 의 무엇을 붙이면 프린터 라운지에 무엇이 보이나 (지원 표 · 받는 상태 목록) */
    var Y = '<i class="y">✅</i>', N = '<i class="n">–</i>', tr = function (name, a, b, c, d) { return '<tr><th scope="row">' + name + '</th><td>' + a + '</td><td>' + b + '</td><td>' + c + '</td><td>' + d + '</td></tr>'; };
    var sup = tx('what_works_for_printers') +
      tx('bambu_lab_edge_driver') +
      tr(tx('print_start_end_logged'), Y, Y, Y + tx('by_power'), N) + tr(tx('progress'), Y, Y, N, N) + tr(tx('time_left'), tx('estimate'), Y, N, N) + tr(tx('print_name'), N, Y, N, N) +
      tr(tx('paused_failed_distinction'), N, Y, N, N) + tr(tx('nozzle_bed_temperature'), Y, Y, N, N) + tr(tx('ams_humidity_light'), Y, N, N, N) + tr(tx('part_fan'), N, Y, N, N) + tr(tx('ambient_temperature_humidity'), N, N, N, Y) +
      tr(tx('camera_timelapse'), N, N, N, N) + '</tbody></table></div>' +
      tx('status_reported_by_bambu') +
      tx('status_reported_by_klipper') +
      tx('power_plug_above_the') +
      tx('printer_devices_are_3d');
    var si = sup.indexOf('<ul class="hal-sup-st">'), supA = si > 0 ? sup.slice(0, si) + '</section>' : sup, supB = si > 0 ? tx('received_states_what_printers') + sup.slice(si) : '';   // 1.16.0 한 화면에 들어가게 둘로
    var more = tx('good_to_know') +
      tx('to_add_or_remove_3') +
      tx('to_receive_sensors_from') +
      tx('power_metering_plugs_count') +
      tx('to_show_it_in_2') +
      tx('to_use_it_for') +
      tx('if_the_card_shows') +
      tx('to_stop_using_it') +
      tx('illustrations_are_mock_ups_2');
    return tx('no_app_to_install') + stPay() + '</div>' + guideSteps(steps, [['sup', '🖨️', tx('what_works_for_printers_2'), tx('support_table'), supA], ['sts', '📋', tx('received_states'), tx('bambu_klipper_plug'), supB], ['more', '💡', tx('good_to_know_2'), '', more]]);
  }
  /** 1.10.0 🧩 연결 방법 › Matter — 3ds Matter 연결 프로그램 (Matter 서버가 있으면 붙기만 · 없으면 같이 띄움) */
  function guideMt() {   // 1.11.1 스크롤 없이 — 그림 단추를 누르면 그것 하나만 (◀ 처음으로)
    var site = (S.d.link && S.d.link.site) || location.origin;
    var T = [['win', '💻', tx('one_line_install'), tx('windows_linux_mac_raspberry')], ['pi', '🐳', tx('with_a_matter_server'), tx('docker_raspberry_pi_nas')], ['pair', '📲', tx('add_sensors'), tx('pairing_code')], ['dev', '📦', tx('site_devices'), tx('waiting_area_attach')], ['thread', '📶', tx('thread_sensors'), tx('border_router')], ['off', '🔌', tx('disconnect_3'), tx('turn_off_remove_sensors')]];   // 1.13.0 🔌
    var P = {
      win: mtWin(),
      pi: tx('homes_without_a_matter') +
        tx('download_as_in_the') +
        tx('below_create_a_device') + esc(site) + tx('if_you_already_have') +
        '<div class="hal-row"><a class="hal-btn pri" href="' + MT_REPO + tx('readme_target_blank_rel_2'),
      pair: tx('add_sensors_enter_the') +
        tx('apple_home_sensor_turn') +
        tx('asked_during_install_or'),
      dev: tx('site_devices_one_line') +
        tx('docker_version_create_a'),
      thread: tx('thread_sensors_border_router') +
        tx('matter_server_side_on'),
      // 1.13.0 🔌 연결 끊기 — 중계 끄기 · 센서 빼기 · 사이트 기기 지우기 (필요한 것만)
      off: tx('disconnect_only_what_you') +
        tx('turn_off_the_relay_2') +
        tx('remove_one_sensor_removes') +
        tx('delete_only_the_site')
    };
    return tx('sensor_matter_server_relay') +
      '<div class="hal-mtg-tiles">' + T.map(function (t) { return '<button type="button" class="hal-mtg-tile' + (t[0] === 'win' ? ' main' : '') + '" data-mtg="' + t[0] + '"><i aria-hidden="true">' + t[1] + '</i><b>' + t[2] + '</b><small>' + t[3] + '</small></button>'; }).join('') + '</div>' +
      Object.keys(P).map(function (k) { return '<div class="hal-mtg-pane" data-mtg-pane="' + k + tx('hidden_back_to_start') + P[k] + '</div>'; }).join('') + '</div>';
  }
  function mtGuideBind(root) {
    root.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-mtg]'), b = ev.target.closest('[data-mtg-back]'); if (!t && !b) return;
      var g = (t || b).closest('.hal-mtg'), k = t ? t.getAttribute('data-mtg') : '';
      g.querySelector('.hal-mtg-tiles').hidden = !!k; var fl = g.querySelector('.hal-mtg-flow'); if (fl) fl.hidden = !!k;
      if (g.parentNode) Array.prototype.forEach.call(g.parentNode.querySelectorAll('[data-mtg-top]'), function (x) { x.hidden = !!k; });   // 1.16.0 머리 글도 (걸음 하나만 보일 때)
      Array.prototype.forEach.call(g.querySelectorAll('[data-mtg-pane]'), function (p) { p.hidden = p.getAttribute('data-mtg-pane') !== k; });
      var c = g.closest('.hal-modal-c'); if (c) c.scrollTop = 0;
    });
  }
  function guideBox(tab) {
    var T = S.d.smartthings || {}, hasSt = !!(T.oauth || (T.installs || []).some(function (x) { return x.mode === 'oauth'; }));
    tab = tab === 'mt' || tab === 'mq' || tab === 'app' || tab === 'trader' ? tab : (tab || srcTab()) === 'st' && hasSt ? 'st' : 'ha';   // 1.10.0 🧩 · 1.16.0 📨 · 1.19.7 📱 🏢
    var seg = '<div class="hal-seg" role="tablist"><button type="button" role="tab" data-gt="ha">' + haLogo() + ' Home Assistant</button>' + (hasSt ? '<button type="button" role="tab" data-gt="st">' + stLogo() + ' SmartThings</button>' : '') + '<button type="button" role="tab" data-gt="mt">' + mtLogo() + ' Matter</button><button type="button" role="tab" data-gt="mq">' + mqLogo() + ' MQTT · BT</button><button type="button" role="tab" data-gt="app">' + tx('gt_app') + '</button><button type="button" role="tab" data-gt="trader">' + tx('gt_trader') + '</button></div>';
    var ov = modal(tx('how_to_connect_4'), seg + '<div data-gp="ha">' + guideHa() + '</div>' + (hasSt ? '<div data-gp="st">' + guideSt() + '</div>' : '') + '<div data-gp="mt">' + guideMt() + '</div><div data-gp="mq">' + guideMq() + '</div>' +
      '<div data-gp="app">' + tx('app_guide_top') + tx('app_relay_guide') + '</div><div data-gp="trader">' + tx('trader_guide_top') + '<section class="hal-sec">' + tx('trader_how') + '</section></div>', { left: '<button type="button" class="hal-btn pri" data-start></button>' });
    ov.classList.add('wide');
    mtWinBind(ov); mtGuideBind(ov); mqWinBind(ov);   // 1.11.0 🪟 · 1.11.1 그림 단추 · 1.16.0 📨
    var show = function (t) {
      tab = t;
      Array.prototype.forEach.call(ov.querySelectorAll('[data-gp]'), function (p) { p.hidden = p.getAttribute('data-gp') !== t; });
      Array.prototype.forEach.call(ov.querySelectorAll('[data-gt]'), function (b) { var on = b.getAttribute('data-gt') === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      var st = ov.querySelector('[data-start]'); st.textContent = t === 'st' ? tx('connect_smartthings') : t === 'mt' ? tx('create_a_device_to') : t === 'mq' ? tx('broker_settings_3') : tx('connect_now'); st.hidden = (t === 'st' && !T.oauth) || t === 'app' || t === 'trader';   // 📱 🏢 는 앱 · 프로그램에서 함
      ov.querySelector('.hal-modal-c').scrollTop = 0;
    };
    show(tab);
    ov.addEventListener('click', function (ev) {
      var g = ev.target.closest('[data-gt]'); if (g) { show(g.getAttribute('data-gt')); return; }
      var st = ev.target.closest('[data-start]'); if (!st) return;
      if (tab === 'st') { stGo(st); return; }
      ov.__close(); if (tab === 'mt') { form(null, 'mt'); return; } if (tab === 'mq') { mqSetBox(); return; } connectBox('ha');
    });
  }

  /** ➕ 기기 연결 — HACS 통합으로 (쉬움: HA 화면에서 센서를 고르면 끝) · 아니면 설정 글을 직접 붙여 넣기 */
  /* 1.3.1 어느 쪽을 먼저 보일까 — SmartThings 만 쓰는 회원(이어 둔 위치가 있고 Home Assistant 기기가 없음)이면 SmartThings, 아니면 Home Assistant */
  function srcTab() {
    var T = S.d.smartthings || {}, oa = (T.installs || []).some(function (x) { return x.mode === 'oauth'; });
    return oa && !(S.d.devices || []).some(function (d) { return d.source !== 'smartthings'; }) ? 'st' : 'ha';
  }
  /* 1.3.1 ➕ 기기 연결 › SmartThings — 아직이면 「연결하기」, 이었으면 위치마다 「센서 고르기」 · 무엇을 붙일 수 있나 */
  function stConnect(T, oa) {
    var what = tx('what_can_be_attached') +
      tx('thermo_hygrometers_filament_storage') +
      tx('power_metering_plugs_printer') +
      tx('printer_devices_edge_driver') +
      tx('door_motion_brightness_battery') +
      tx('in_choose_sensors_pick');
    if (!oa.length) {
      return tx('s_1_connect_with_your') +
        tx('s_1_sign_in_with_2') +
        (T.oauth ? tx('connect_smartthings_2') : tx('the_admin_hasn_t_2')) +
        tx('the_site_only_reads_3') + what + stPay();
    }
    return tx('s_1_choose_sensors_to') + oa.map(function (x) {
        return '<div class="hal-ct-loc"><span><b>📍 ' + esc(x.location || tx('smartthings_location')) + tx('receiving') + (x.picked || 0) + tx('sensors_5') + (x.last_error ? tx('needs_attention_3') : '') + '</small></span>' +
          '<button type="button" class="hal-btn pri" data-st-pick="' + x.id + tx('choose_sensors_4');
      }).join('') + '</div>' +
      tx('for_newly_bought_sensors') +
      (T.oauth ? tx('connect_another_location_home') : '') + '</section>' + what + stPay();
  }
  function connectBox(tab) {
    var T = S.d.smartthings || {}, oa = (T.installs || []).filter(function (x) { return x.mode === 'oauth'; }), hasSt = !!(T.oauth || oa.length);
    tab = tab === 'mt' ? 'mt' : (tab || srcTab()) === 'st' && hasSt ? 'st' : 'ha';   // 1.10.0 🧩
    var seg = '<div class="hal-seg" role="tablist"><button type="button" role="tab" data-ct="ha">' + haLogo() + ' Home Assistant</button>' + (hasSt ? '<button type="button" role="tab" data-ct="st">' + stLogo() + ' SmartThings</button>' : '') + '<button type="button" role="tab" data-ct="mt">' + mtLogo() + ' Matter</button></div>';
    var L = S.d.link, rp = String(L.repo).split('/'), my = 'https://my.home-assistant.io/redirect/';
    var row = function (label, val, key) { return '<div class="hal-copy"><span>' + label + '</span><code>' + esc(val) + '</code><button type="button" class="hal-btn sm pri" data-cp="' + key + tx('copy_2'); };
    var ov = modal(tx('connect_device_2'), seg + tx('s_1_install_3ds_from') +
        '<div class="hal-row"><a class="hal-btn pri" target="_blank" rel="noopener" href="' + my + 'hacs_repository/?owner=' + encodeURIComponent(rp[0]) + '&repository=' + encodeURIComponent(rp[1] || '') + tx('category_integration_open_in') +
        tx('on_the_screen_that') + esc(L.repo) + tx('type_integration_under_hacs') +
      tx('s_2_add_the_integration') +
        '<div class="hal-row"><a class="hal-btn" target="_blank" rel="noopener" href="' + my + tx('config_flow_start_domain') + row(tx('site_url'), L.site, 'site') + row(tx('link_code_2'), L.code, 'code') +
        tx('the_link_code_is') +
      tx('s_3_auto_detect_and') + (hasSt ? '<div data-cpn="st">' + stConnect(T, oa) + '</div>' : '') +
      '<div data-cpn="mt">' + guideMt() + tx('create_a_device_to_2'),
      { left: tx('illustrated_guide_create_new') });
    mtWinBind(ov); mtGuideBind(ov);   // 1.11.0 🪟 · 1.11.1 그림 단추
    // 1.3.1 Home Assistant · SmartThings 바꿔 보기
    var show = function (t) {
      tab = t;
      Array.prototype.forEach.call(ov.querySelectorAll('[data-cpn]'), function (p) { p.hidden = p.getAttribute('data-cpn') !== t; });
      Array.prototype.forEach.call(ov.querySelectorAll('[data-ct]'), function (b) { var on = b.getAttribute('data-ct') === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      var ho = ov.querySelector('[data-ha-only]'); if (ho) ho.hidden = t !== 'ha';
      ov.querySelector('.hal-modal-c').scrollTop = 0;
    };
    show(tab);
    ov.addEventListener('click', function (ev) {
      var ct = ev.target.closest('[data-ct]'); if (ct) { show(ct.getAttribute('data-ct')); return; }
      if (ev.target.closest('[data-ct-mt]')) { ov.__close(); form(null, 'mt'); return; }   // 1.10.0 🧩
      var sg = ev.target.closest('[data-st-go]'); if (sg) { stGo(sg); return; }
      var sp = ev.target.closest('[data-st-pick]'); if (sp) { ov.__close(); stPick(+sp.getAttribute('data-st-pick')); return; }
      if (ev.target.closest('[data-guide-st]')) { ev.preventDefault(); ov.__close(); guideBox('st'); return; }
      var c = ev.target.closest('[data-cp]'); if (c) { copy(c.getAttribute('data-cp') === 'site' ? L.site : L.code, c); return; }
      if (ev.target.closest('[data-guide2]')) { ov.__close(); guideBox(tab); return; }
      if (ev.target.closest('[data-manual]')) { ov.__close(); form(null); return; }
      if (ev.target.closest('[data-rl]') && confirm(tx('create_a_new_link_2'))) api('POST', '/link/rotate', {}).then(function (r) { toast(r.message); S.d = r.data.overview; ov.__close(); connectBox('ha'); }).catch(fail);
    });
  }

  // ── 떠 있는 창 ──
  function modal(title, html, o) {
    o = o || {};
    var ov = document.createElement('div'); ov.className = 'hal-modal';
    ov.innerHTML = '<div class="hal hal-modal-w"><div class="hal-modal-b" role="dialog" aria-modal="true"><header class="hal-modal-h"><h3>' + title + tx('s_24') +
      '<div class="hal-modal-c">' + html + '</div><footer class="hal-modal-f"><div>' + (o.left || '') + tx('close') + (o.onSave ? '<button type="button" class="hal-btn pri" data-ok>' + (o.ok || tx('save')) + '</button>' : '') + '</div></footer></div></div>';
    var root = document.documentElement, down = null;
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    var close = function () { ov.remove(); root.classList.remove('hal-modal-open'); document.removeEventListener('keydown', onKey); };
    ov.__close = close;
    document.body.appendChild(ov); root.classList.add('hal-modal-open'); document.addEventListener('keydown', onKey);
    ov.addEventListener('mousedown', function (e) { down = e.target; });
    ov.addEventListener('click', function (e) { if ((e.target === ov && down === ov) || e.target.closest('[data-x]')) close(); });
    var ok = ov.querySelector('[data-ok]');
    if (ok) ok.onclick = function () { ok.disabled = true; o.onSave(ov).then(function () { close(); }).catch(function (e) { ok.disabled = false; fail(e); }); };
    return ov;
  }
  /** 프린터 통합마다 흔히 쓰는 센서 이름 (앞 이름만 바꿔 채움 — 통합 버전에 따라 다를 수 있음) */
  var PRESET = {
    bambu: ['Bambu Lab', { state: 'sensor.{p}_print_status', progress: 'sensor.{p}_print_progress', remaining: 'sensor.{p}_remaining_time', job: 'sensor.{p}_task_name', temp: 'sensor.{p}_chamber_temperature' }],
    klipper: ['Klipper (Moonraker)', { state: 'sensor.{p}_current_print_state', progress: 'sensor.{p}_progress', job: 'sensor.{p}_filename' }],
    octo: ['OctoPrint', { state: 'sensor.{p}_current_state', progress: 'sensor.{p}_job_percentage' }]
  };
  function form(d, kind) {   // 1.10.0 kind = 'mt' — 🧩 Matter 기기로 새로 만들기 (센서 이름 없이)
    var D = S.d, isNew = !d, isSt = !!(d && d.source === 'smartthings'), isMt = d ? d.source === 'matter' : kind === 'mt', isMq = !!(d && d.source === 'mqtt');   // 1.15.0 📨
    d = d || { target: 'location', name: '', location: '', entities: {}, humidity_max: 40, temp_max: null, notify: true, snap_public: false };
    var e = d.entities, ent = function (k, label, ph) { return '<label>' + label + '<input name="ent_' + k + '" value="' + esc(e[k] || '') + '" placeholder="' + ph + '" autocapitalize="off" autocomplete="off" spellcheck="false"></label>'; };
    var tg = Object.keys(D.targets).filter(function (k) { return k === 'location' || k === 'other' || (k === 'printer' && D.printers.length) || (k === 'equipment' && D.equipment.length); });
    var html =
      tx('s_1_what_to_attach') + tg.map(function (k) { return '<label><input type="radio" name="target" value="' + k + '"' + (d.target === k ? ' checked' : '') + '><span><i>' + ICON[k] + '</i>' + esc(D.targets[k]) + '</span></label>'; }).join('') + '</div>' +
        tx('storage_location_same_as') + esc(d.location || '') + tx('placeholder_e_g_dry') + D.locations.map(function (l) { return '<option value="' + esc(l) + '">'; }).join('') + '</datalist></label>' +
          (D.locations.length ? tx('pick_from_storage_boxes') + D.locations.map(function (l) { return '<button type="button" class="hal-locchip" data-loc="' + esc(l) + '">📦 ' + esc(l) + '</button>'; }).join('') + '</div>' : '') + '</div>' +   // 1.4.12
        tx('my_printer') + D.printers.map(function (p) { return '<option value="' + p.id + '"' + (d.printer_id === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></label></div>' +
        tx('company_equipment_3') + D.equipment.map(function (x) { var c = D.companies.filter(function (y) { return y.id === x.company_id; })[0]; return '<option value="' + x.id + '"' + (d.equipment_id === x.id ? ' selected' : '') + '>' + esc((c ? c.name + ' — ' : '') + x.name) + '</option>'; }).join('') + '</select></label></div>' +
        tx('name_blank_what_you') + esc(d.name || '') + tx('placeholder_e_g_living') +
        tx('category_where_it_s') + grpOpts(d.grp || '', isNew ? 'new' : d.group_auto || 'none') + '</select></label></section>' +   // 1.4.6
      (isSt ? '<section class="hal-sec"><h4><em>2</em> ' + stLogo() + tx('smartthings_sensor_this_device') : '') +
      (isMt ? '<section class="hal-sec"><h4><em>2</em> ' + mtLogo() + tx('matter_sensor_this_device') + (isNew ? tx('put_the_receive_key') : tx('view_receive_key_config')) + '</p></section>' : '') +
      (isMq ? '<section class="hal-sec"><h4><em>2</em> ' + mqLogo() + tx('mqtt_topic_this_device') : '') +
      (isSt || isMt || isMq ? '' : tx('s_2_home_assistant_sensor') +
        tx('quick_fill') + Object.keys(PRESET).map(function (k) { return '<button type="button" class="hal-chip" data-preset="' + k + '">' + PRESET[k][0] + '</button>'; }).join('') + '</div>' +
        '<div class="hal-two">' + ent('hum', tx('humidity_2'), 'sensor.drybox_humidity') + ent('temp', tx('temperature'), 'sensor.drybox_temperature') + '</div>' +
        '<div data-for="printer equipment other">' + ent('state', tx('status_printer_status_power'), tx('sensor_p1s_print_status')) + '</div>' +
        '<div data-for="printer" class="hal-two">' + ent('progress', tx('progress'), 'sensor.p1s_print_progress') + ent('remaining', tx('time_left_min'), 'sensor.p1s_remaining_time') + ent('job', tx('job_name'), 'sensor.p1s_task_name') + '</div></section>') +
      tx('s_3_alert_thresholds_blank') +
        tx('humidity_below_input_name') + esc(d.humidity_min == null ? '' : d.humidity_min) + tx('placeholder_no_alert') +   // 1.9.0 아래 기준
          tx('temperature_below_c_input') + esc(d.temp_min == null ? '' : d.temp_min) + tx('placeholder_no_alert_2') +
        tx('humidity_above_2') + [20, 30, 40, 50].map(function (v) { return '<button type="button" class="hal-chip" data-hm="' + v + '">' + v + '%</button>'; }).join('') + '</div><input name="humidity_max" type="number" min="1" max="100" inputmode="numeric" value="' + esc(d.humidity_max == null ? '' : d.humidity_max) + tx('placeholder_no_alert') +
        tx('temperature_above_c_input') + esc(d.temp_max == null ? '' : d.temp_max) + tx('placeholder_no_alert_2') +
        '<label class="hal-chk"><input type="checkbox" name="notify"' + (d.notify ? ' checked' : '') + tx('get_alerts_when_over') +
      (isSt || isMt || isMq ? '' : tx('s_4_camera_snapshots_when') + (d.snap_public ? ' checked' : '') + tx('show_snapshots_to_other'));
    var ov = modal(isNew ? (isMt ? mtLogo() + tx('create_matter_device') : tx('connect_device_2')) : tx('edit_device'), html, {
      ok: isNew ? (isMt ? tx('create_and_view_receive') : tx('create_and_view_config')) : tx('save'),
      left: isNew ? '' : tx('delete'),
      onSave: function (o) {
        var v = {}; Array.prototype.forEach.call(o.querySelectorAll('[name]'), function (i) { if (i.type === 'radio' && !i.checked) return; v[i.name] = i.type === 'checkbox' ? i.checked : i.value.trim(); });
        if (isNew && isMt) v.source = 'matter';   // 1.10.0 🧩
        return api(isNew ? 'POST' : 'PUT', '/devices' + (isNew ? '' : '/' + d.id), v).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); if (isNew) setTimeout(function () { yamlBox(find(r.data.id)); }, 60); });
      }
    });
    var $ = function (sel) { return ov.querySelector(sel); }, f = function (k) { return $('[name="' + k + '"]'); };
    var sync = function () {
      var t = ($('[name=target]:checked') || {}).value || 'location';
      Array.prototype.forEach.call(ov.querySelectorAll('[data-for]'), function (el) { el.hidden = el.getAttribute('data-for').split(' ').indexOf(t) < 0; });
      Array.prototype.forEach.call(ov.querySelectorAll('[data-hm]'), function (b) { b.classList.toggle('on', b.getAttribute('data-hm') === f('humidity_max').value); });
      var lk = function (v) { return String(v || '').replace(/\s+/g, '').toLowerCase(); }, cur = lk(f('location') && f('location').value);   // 1.4.12 고른 보관함 표시
      Array.prototype.forEach.call(ov.querySelectorAll('[data-loc]'), function (b) { b.classList.toggle('on', cur !== '' && lk(b.getAttribute('data-loc')) === cur); });
    };
    ov.addEventListener('change', sync); ov.addEventListener('input', sync); sync();
    ov.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-mt-key]')) { ev.preventDefault(); ov.__close(); mtKeyBox(d); return; }   // 1.10.0 🧩
      var hm = ev.target.closest('[data-hm]'); if (hm) { f('humidity_max').value = hm.getAttribute('data-hm'); sync(); return; }
      var lc = ev.target.closest('[data-loc]'); if (lc) { f('location').value = lc.getAttribute('data-loc'); if (!f('name').value) f('name').placeholder = lc.getAttribute('data-loc'); sync(); return; }   // 1.4.12 📦
      var ps = ev.target.closest('[data-preset]'); if (!ps) return;
      var p = prompt(tx('enter_the_first_part'), ''); if (!p) return;
      p = p.trim().toLowerCase().replace(/^sensor\./, '').replace(/[^a-z0-9_]/g, '_'); var set = PRESET[ps.getAttribute('data-preset')][1];
      Object.keys(set).forEach(function (k) { var el = f('ent_' + k); if (el && !el.closest('[hidden]')) el.value = set[k].replace('{p}', p); });
      toast(tx('filled_in_please_check'));
    });
    var del = $('[data-del]'); if (del) del.onclick = function () { if (confirm('「' + d.name + tx('delete_this_connection_its'))) api('DELETE', '/devices/' + d.id).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); ov.__close(); }).catch(fail); };
  }

  /** Home Assistant 에 붙여 넣을 설정 글 — rest_command(보내는 방법) + automation(10분마다 · 상태가 바뀔 때) */
  function yamlText(d) {
    var iv = Math.max(1, +S.d.config.interval_min || 10);   // 0.1.3 사이트가 정한 주기
    var e = d.entities, id = 'g7_ha_' + d.id, st = function (x) { return "{{ states(''" + x + "'') | tojson }}"; }, parts = [];
    if (e.temp) parts.push('"temperature": ' + st(e.temp)); if (e.hum) parts.push('"humidity": ' + st(e.hum)); if (e.state) parts.push('"state": ' + st(e.state));
    if (d.target === 'printer') { if (e.progress) parts.push('"progress": ' + st(e.progress)); if (e.remaining) parts.push('"remaining_min": ' + st(e.remaining)); if (e.job) parts.push('"job": ' + st(e.job)); }
    var conf = 'rest_command:\n  ' + id + ':\n    url: "' + S.d.config.base + d.token + '"\n    method: POST\n    content_type: "application/json"\n    payload: \'{' + parts.join(', ') + '}\'\n';
    var auto = tx('alias_3ds_send') + String(d.name).replace(/["\\]/g, '') + '"\n  trigger:\n    - platform: time_pattern\n      ' + (iv >= 60 ? 'hours: "/1"' : 'minutes: "/' + iv + '"') + '\n' + (e.state ? '    - platform: state\n      entity_id: ' + e.state + '\n' : '') + '  action:\n    - service: rest_command.' + id + '\n  mode: single\n';
    return [conf, auto];
  }
  /** 1.10.0 🧩 Matter 기기 — 받는 키 · 3ds Matter 연결 설정 (config.yaml 의 devices 한 줄) */
  function mtKeyBox(d) {
    if (!d) return;
    var site = (S.d.link && S.d.link.site) || location.origin;
    var conf = 'site: ' + site + tx('devices_node_1_node') + String(d.name).replace(/[\r\n]+/g, ' ') + '\n    key: ' + d.token + '\n';
    var ov = modal(mtLogo() + ' ' + esc(d.name) + tx('add_to_3ds_matter'),
      tx('s_1_receive_key_like') + esc(d.token) + tx('copy_new_4') +
      tx('s_2_add_to_config') + esc(conf) + tx('copy_3') +
        tx('replace_node_with_the') +
      tx('no_3ds_matter_link') + MT_REPO + tx('readme_target_blank_rel_3'));
    ov.addEventListener('click', function (ev) {
      var c = ev.target.closest('[data-mtcp]'); if (c) { copy(c.getAttribute('data-mtcp') === 'key' ? d.token : conf, c); return; }
      if (ev.target.closest('[data-mt-rot]') && confirm('「' + d.name + tx('create_a_new_receive')))   // 1.16.6 🔑
        api('POST', '/devices/' + d.id + '/rotate', {}).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); ov.__close(); mtKeyBox(find(d.id)); }).catch(fail);
    });
  }
  function yamlBox(d) {
    if (!d) return;
    if (d.source === 'matter') { mtKeyBox(d); return; }   // 1.10.0 🧩 Matter 기기는 HA 설정 글이 아니라 받는 키
    if (d.source === 'mqtt') { toast(tx('mqtt_devices_have_no')); return; }   // 1.15.0 📨
    var y = yamlText(d), box = function (i, title, sub) { return '<section class="hal-sec"><h4><em>' + (i + 1) + '</em> ' + title + ' <small>' + sub + '</small></h4><div class="hal-code"><pre>' + esc(y[i]) + '</pre><button type="button" class="hal-btn sm pri" data-copy="' + i + tx('copy_4'); };
    var ov = modal('📋 ' + esc(d.name) + tx('paste_into_home_assistant'),
      box(0, tx('paste_into_configuration_yaml'), tx('if_rest_command_already')) +
      box(1, tx('paste_into_automations_yaml'), (S.d.config.interval_min || 10) + tx('every') + (d.entities.state ? tx('when_status_changes') : '') + tx('sends')) +
      tx('s_3_restart_home_assistant') + (d.target === 'printer' ? tx('printer_status_also_goes') : '') + '</p></section>',
      { left: tx('create_new_url') });
    ov.addEventListener('click', function (ev) {
      var c = ev.target.closest('[data-copy]');
      if (c) { copy(y[+c.getAttribute('data-copy')], c); return; }
      if (ev.target.closest('[data-rotate]') && confirm(tx('create_a_new_receiving'))) {
        api('POST', '/devices/' + d.id + '/rotate', {}).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); ov.__close(); yamlBox(find(d.id)); }).catch(fail);
      }
    });
  }

  // ── 관리자 ──
  var FIELDS = [['enabled', tx('use_iot_link'), 'bool'], ['menu_enabled', tx('add_iot_link_to'), 'bool'], ['menu_label', tx('header_menu_name_up'), 'text'],
    ['max_devices', tx('devices_one_member_can'), 'num'], ['max_devices_company', tx('devices_per_company_default'), 'num'],   // 1.4.7
    ['limit_admin_free', tx('exempt_admins_super_admin'), 'bool'],   // 1.4.10
    ['slot_enabled', tx('sell_sensor_slots_beyond'), 'bool'], ['slot_mode', tx('slot_billing'), 'sel', [['once', tx('buy_once_keep_forever')], ['monthly', tx('monthly_billing_auto_renew_2')]]],
    ['slot_coin_price', tx('price_per_sensor_coins'), 'num'], ['slot_coin_price10', tx('price_per_10_sensor'), 'num'], ['slot_mileage_price', tx('price_per_sensor_mileage'), 'num'], ['slot_mileage_price10', tx('price_per_10_sensor_2'), 'num'], ['slot_cancel_days', tx('cancel_refund_only_unused'), 'num'],   // 1.8.3   // 1.4.8
    ['max_devices_members', tx('per_member_member_id'), 'area'], ['max_devices_companies', tx('per_company_company_id'), 'area'], ['send_mode', tx('sending_mode_3ds_integration'), 'sel', [['change', tx('send_when_values_change')], ['interval', tx('send_periodically')]]],
    ['change_hum', tx('on_change_send_when'), 'num'], ['idle_min', tx('on_change_send_once'), 'num'],
    ['interval_min', tx('periodically_config_text_yaml'), 'num'], ['refresh_sec', tx('interval_for_the_screen'), 'num'],
    ['away_after_min', tx('away_when_a_member'), 'num'], ['away_interval_min', tx('sending_interval_when_away'), 'num'], ['keep_days', tx('days_to_keep_temp'), 'num'], ['stale_hours', tx('hours_without_activity_before'), 'num'], ['alert_gap_hours', tx('hours_before_resending_a'), 'num'],
    ['load_slow', tx('increase_device_connection_intervals'), 'bool'],   // 1.17.0
    ['notify_site', tx('site_notification_when_over'), 'bool'], ['notify_mail', tx('email_too_when_over'), 'bool'], ['snapshot', tx('receive_camera_snapshots_latest'), 'bool'], ['snap_gap_min', tx('shortest_interval_to_receive'), 'num'], ['printer_link', tx('pass_print_status_to'), 'bool'], ['company_link', tx('link_to_company_owned'), 'bool'], ['hacs_repo', tx('hacs_integration_repository_github'), 'text'], ['timezone', tx('time_zone_e_g'), 'text']];
  /* 📡 SmartThings — 관리자 설정 · 앱 등록 안내 (한 걸음씩)
   *  1.1.0 API Access App (OAuth-In) — ⚡ 자동 등록(개인 액세스 토큰을 한 번 붙여 넣기) · 📝 직접 등록(Developer Center 또는 SmartThings CLI)
   *  0.2.0 의 Developer Workspace · WebHook SmartApp(연결 코드) 방식은 「고급」에 */
  var ST_FIELDS = [['st_enabled', tx('use_smartthings_connection'), 'bool'], ['st_client_id', 'Client ID', 'text'], ['st_client_secret', 'Client Secret', 'secret']];
  var ST_MORE = [['st_app_id', tx('app_id_leave_blank'), 'text'], ['st_max_events_min', tx('values_one_location_can'), 'num'], ['st_poll_min', tx('if_no_value_arrives'), 'num'],
    ['st_code_flow', tx('legacy_also_show_linking'), 'bool'], ['st_code_min', tx('legacy_link_code_validity'), 'num'],
    ['st_ping_unsigned', tx('legacy_also_respond_to'), 'bool'], ['st_public_key', tx('signature_public_key_pem'), 'area']];
  function stField(s, f) {
    if (f[2] === 'bool') return '<label class="hal-chk"><input type="checkbox" data-k="' + f[0] + '"' + (s[f[0]] ? ' checked' : '') + '> ' + esc(f[1]) + '</label>';
    if (f[2] === 'secret') return '<label>' + esc(f[1]) + ' <small>' + (s.st_client_secret_set ? tx('saved_encrypted_enter_only') : tx('none_yet')) + '</small><input type="password" autocomplete="new-password" data-k="' + f[0] + '" value="" placeholder="' + (s.st_client_secret_set ? tx('keep_as_is') : tx('client_secret_received_when')) + '"></label>';
    if (f[2] === 'area') return '<label class="full">' + esc(f[1]) + '<textarea data-k="' + f[0] + '" rows="3" spellcheck="false" placeholder="-----BEGIN PUBLIC KEY-----">' + esc(s[f[0]] || '') + '</textarea></label>';
    return '<label>' + esc(f[1]) + '<input type="' + (f[2] === 'num' ? 'number' : 'text') + '" data-k="' + f[0] + '" value="' + esc(s[f[0]]) + '" autocomplete="off" spellcheck="false"></label>';
  }
  function stAdmin(s, info) {
    var I = info || {}, done = !!(s.st_client_id && s.st_client_secret_set);
    var cp = function (label, v, k) { return '<div class="hal-copy">' + (label ? '<span>' + label + '</span>' : '') + '<code>' + esc(v) + '</code><button type="button" class="hal-btn sm pri" data-acp="' + k + tx('copy_2'); };
    var ok = !done ? tx('not_registered_yet') : !s.st_enabled ? tx('registered_use_smartthings_connection')
      : I.confirmed_at ? tx('url_confirmed') + esc(I.confirmed_at) + '</span>' : tx('waiting_for_url_confirmation');
    var li = function (x, i) { return '<li><em>' + (i + 1) + '</em><div><b>' + x[0] + '</b><p>' + x[1] + '</p>' + (x[2] || '') + '</div></li>'; };
    var auto = [
      [tx('create_a_personal_access'), tx('sign_in_to_account')],
      [tx('paste_the_token_and'), tx('the_site_creates_the') + esc(I.app_name || '') + tx('in_smartthings_saves_the'),
        tx('button_type_button_class') + (I.https === false ? ' disabled' : '') + tx('auto_register')],
      [tx('done_try_connecting_with'), tx('once_url_confirmed_appears') + BASE + '" target="_blank">' + BASE + tx('smartthings_card_shows_the')]
    ];
    var manual = [
      [tx('open_the_app_registration'), tx('developer_center_service_integrations'), cp('', 'smartthings apps:create', 'cli')],
      [tx('paste_the_values_below'), tx('members_see_the_name'),
        cp('Display Name', I.app_name || '', 'name') + cp('Target URL', I.target_url || '', 'url') + cp('Redirect URI', I.redirect_uri || '', 'redirect') + cp('Scopes', (I.scopes || []).join(' '), 'scopes')],
      [tx('paste_the_client_id'), tx('the_client_secret_is')],
      [tx('url_confirmation'), tx('when_the_app_is')]
    ];
    return '<section class="hal-form hal-st-admin"><div class="full hal-st-ah"><h2>' + stLogo() + tx('smartthings_connection_api_access') + ok + tx('connected_locations') + n(I.installs) + tx('linked_to_members') + n(I.linked) + '</span></div>' +
      (I.https === false ? tx('the_site_url_app') : '') +
      '<div class="full hal-st-how"><div class="hal-seg" role="tablist"><button type="button" role="tab" data-rt="auto" class="' + (done ? '' : 'on') + tx('auto_register_recommended_button') + (done ? 'on' : '') + tx('register_manually') +
        '<ol class="hal-st-steps" data-rp="auto"' + (done ? ' hidden' : '') + '>' + auto.map(li).join('') + '</ol><ol class="hal-st-steps" data-rp="manual"' + (done ? '' : ' hidden') + '>' + manual.map(li).join('') + '</ol></div>' +
      ST_FIELDS.map(function (f) { return stField(s, f); }).join('') +
      tx('paid_plan_notice_samsung') +
      tx('the_member_screen_s') + ST_PAY_URL + tx('target_blank_rel_noopener') +
      tx('advanced_legacy_method_link') + ST_MORE.map(function (f) { return stField(s, f); }).join('') +
        tx('legacy_method_if_you') + (I.legacy_target_url ? tx('still_received_even_if') + esc(I.legacy_target_url) + tx('s_25') : '') + tx('and_turning_on_also') +
      tx('the_http_signature_rsa') + esc((I.scopes || []).join(' · ')) + tx('and_member_tokens_are');
  }
  /* 1.9.0 ⚙️ 관리자 설정을 탭으로 — 칸은 모두 그려 두고(저장은 그대로 모두) 고른 탭만 보임 · 고른 탭은 이 브라우저에 기억 */
  var AGROUPS = [
    ['base', tx('general'), ['enabled', 'menu_enabled', 'menu_label', 'refresh_sec', 'hacs_repo', 'timezone']],
    ['limit', tx('device_limits'), ['max_devices', 'max_devices_company', 'limit_admin_free', 'max_devices_members', 'max_devices_companies']],
    ['slot', tx('sensor_slots'), ['slot_enabled', 'slot_mode', 'slot_coin_price', 'slot_coin_price10', 'slot_mileage_price', 'slot_mileage_price10', 'slot_cancel_days']],
    ['send', tx('sending_values'), ['send_mode', 'change_hum', 'idle_min', 'interval_min', 'away_after_min', 'away_interval_min', 'load_slow', 'keep_days', 'stale_hours']],
    ['alert', tx('alerts'), ['alert_gap_hours', 'notify_site', 'notify_mail']],
    ['cam', tx('camera_2'), ['snapshot', 'snap_gap_min']],
    ['link', tx('other_extensions'), ['printer_link', 'company_link']],
    ['st', 'SmartThings', []]
  ];
  function agroupOf(k) { for (var i = 0; i < AGROUPS.length; i++) if (AGROUPS[i][2].indexOf(k) >= 0) return AGROUPS[i][0]; return 'base'; }
  function aTab() { var t = pref('atab', 'base'); return AGROUPS.some(function (g) { return g[0] === t; }) ? t : 'base'; }
  function aTabShow() { var t = aTab(); qa('[data-tg]').forEach(function (el) { el.hidden = el.getAttribute('data-tg') !== t; }); qa('[data-atab]').forEach(function (b) { var on = b.getAttribute('data-atab') === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }); }
  function renderAdmin() {
    api('GET', '/admin/settings').then(function (r) {
      var s = r.data.settings, st = r.data.stats;
      wrap(tx('iot_link_admin_member') + BASE + '" target="_blank">' + BASE + tx('members_device_values_receiving') + n(st.users) + tx('devices_3') + n(st.devices) + tx('connected_6') + n(st.live) + tx('history') + n(st.readings) + tx('rows') + stLogo() + ' SmartThings <b>' + n(st.st_installs) + '</b></span></div></section>' +
        tx('s_26') + AGROUPS.map(function (g) { return '<button type="button" role="tab" data-atab="' + g[0] + '">' + (g[0] === 'st' ? stLogo() + ' ' : '') + g[1] + '</button>'; }).join('') + '</div>' +   // 1.9.0 탭
        '<div class="hal-form">' + FIELDS.map(function (f) {
          if (f[2] === 'sel') return '<label data-tg="' + agroupOf(f[0]) + '">' + esc(f[1]) + '<select data-k="' + f[0] + '">' + f[3].map(function (o) { return '<option value="' + o[0] + '"' + (s[f[0]] === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
          if (f[2] === 'area') return '<label data-tg="' + agroupOf(f[0]) + '" class="full">' + esc(f[1]) + '<textarea data-k="' + f[0] + tx('rows_2_spellcheck_false') + esc(s[f[0]] || '') + '</textarea></label>';   // 1.4.7
          return f[2] === 'bool' ? '<label data-tg="' + agroupOf(f[0]) + '" class="hal-chk"><input type="checkbox" data-k="' + f[0] + '"' + (s[f[0]] ? ' checked' : '') + '> ' + esc(f[1]) + '</label>' : '<label data-tg="' + agroupOf(f[0]) + '">' + esc(f[1]) + '<input type="' + (f[2] === 'num' ? 'number' : 'text') + '" data-k="' + f[0] + '" value="' + esc(s[f[0]]) + '"></label>';
        }).join('') + tx('the_sending_mode_is') +
        '</div><div data-tg="st">' + stAdmin(s, r.data.smartthings) + tx('save_2'));
      aTabShow();
      S.root.onclick = function (ev) {
        var at = ev.target.closest('[data-atab]'); if (at) { setPref('atab', at.getAttribute('data-atab')); aTabShow(); return; }   // 1.9.0 탭
        var I = r.data.smartthings || {}, c = ev.target.closest('[data-acp]'), t = ev.target.closest('[data-rt]'), g = ev.target.closest('[data-st-reg]');
        if (c) { copy({ url: I.target_url, redirect: I.redirect_uri, name: I.app_name, cli: 'smartthings apps:create', scopes: (I.scopes || []).join(' ') }[c.getAttribute('data-acp')] || '', c); return; }
        if (t) { qa('[data-rt]').forEach(function (b) { b.classList.toggle('on', b === t); }); qa('[data-rp]').forEach(function (p) { p.hidden = p.getAttribute('data-rp') !== t.getAttribute('data-rt'); }); return; }
        if (g) {   // 1.1.0 ⚡ 자동 등록 — 토큰은 이 요청에만 쓰임 (저장하지 않음)
          var pat = (q('[data-st-pat]').value || '').trim(); if (!pat) { toast(tx('please_paste_a_personal'), true); return; }
          g.disabled = true; g.textContent = tx('registering_with_smartthings');
          api('POST', '/admin/smartthings/register', { token: pat }).then(function (x) { toast(x.message); renderAdmin(); }).catch(function (e) { g.disabled = false; g.textContent = tx('auto_register_2'); fail(e); });
        }
      };
      q('#hal-asave').onclick = function () {
        var out = {}; qa('[data-k]').forEach(function (i) { out[i.getAttribute('data-k')] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? +i.value : i.value; });
        api('PUT', '/admin/settings', { settings: out }).then(function (x) { toast(x.message || tx('saved')); renderAdmin(); }).catch(fail);
      };
    }).catch(function (e) { wrap('<div class="hal-empty">' + esc(e.message) + '</div>'); });
  }

  // ── 시작 ──
  function route() {
    if (S.root.hasAttribute('data-hal-admin')) return renderAdmin();
    var ret = S.ret; S.ret = null;
    // 1.1.0 SmartThings 로그인 · 허용을 마치고 돌아옴 (?code=…&state=…) → 로그인 정보와 함께 서버에 넘겨 잇고, 처음이면 센서 고르기를 바로 엶
    if (ret && ret.code) {
      wrap('<div class="hal-empty">' + stLogo() + tx('connecting_with_smartthings'));
      api('POST', '/smartthings/oauth/finish', { code: ret.code, state: ret.state }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); if (r.data.choose) stPick(r.data.install_id); })
        .catch(function (e) { toast(e.status === 401 ? tx('after_signing_in_click') : e.message, true); route(); });
      return;
    }
    if (ret && ret.error) toast(ret.error === 'access_denied' ? tx('smartthings_connection_cancelled') : tx('smartthings_didn_t_accept') + ret.error + ').', true);
    wrap(tx('loading'));
    api('GET', '/me').then(function (r) { S.d = r.data; draw(); if (S.deep) { S.deep = false; stDeepOpen(); } }).catch(function (e) {
      wrap(e.status === 401 ? tx('iot_link_receives_temp_2') : '<div class="hal-empty">' + esc(e.message) + '</div>');
    });
  }
  /* 1.0.0 예전 주소(/ha-link · /admin/ha-link — HA 연결 때)로 왔으면 주소 줄만 새 주소로 바꿔 보임 (같은 화면 · 다시 불러오지 않음) */
  function newPath() {
    try { var p = location.pathname, q = p.replace(/(^|\/)ha-link(?=\/|$)/, '$1iot-link'); if (q !== p && history.replaceState) history.replaceState(history.state, '', q + location.search + location.hash); } catch (e) {}
  }
  /* 1.1.0 SmartThings 가 돌려보낸 주소 (/iot-link?code=…&state=… 또는 ?error=…&state=…) — 값을 챙기고 주소 줄에서는 바로 지움 (새로 고침 · 뒤로 가기에 다시 쓰이지 않게) */
  function stReturn() {
    try {
      var p = new URLSearchParams(location.search), st = p.get('state') || '', code = p.get('code') || '', err = p.get('error') || '';
      if (!/^[a-f0-9]{40}$/.test(st) || (!code && !err)) return null;
      if (history.replaceState) history.replaceState(history.state, '', location.pathname + location.hash);
      return { code: code, state: st, error: err.replace(/[^\w.-]/g, '').slice(0, 40) };
    } catch (e) { return null; }
  }
  /* 1.2.0 프린터 라운지의 「자동 연결 › SmartThings」에서 넘어옴 (/iot-link?st=pick&printer=7) — 값을 챙기고 주소 줄에서는 지움.
   *   그 프린터는 삼성 로그인을 다녀와도 기억함 (sessionStorage) — 센서 고르기의 「붙일 곳」가 그 프린터로 미리 골라짐 */
  function stDeep() {
    try {
      var p = new URLSearchParams(location.search); if (p.get('st') !== 'pick') return false;
      var id = parseInt(p.get('printer') || '0', 10) || 0;
      if (id > 0) { S.pickPrinter = id; try { sessionStorage.setItem('hal:st:printer', String(id)); } catch (e) {} }
      if (history.replaceState) history.replaceState(history.state, '', location.pathname + location.hash);
      return true;
    } catch (e) { return false; }
  }
  function stDeepOpen() {
    var T = S.d && S.d.smartthings; if (!T) return;
    var oa = (T.installs || []).filter(function (x) { return x.mode === 'oauth'; });
    if (oa.length) { stPick(oa[0].id); return; }
    var card = q('.hal-stc'); if (card && card.scrollIntoView) card.scrollIntoView({ block: 'center' });
    toast(T.oauth ? tx('first_click_connect_smartthings') : tx('the_admin_hasn_t_3'), !T.oauth);
  }
  function tick() {
    var root = document.querySelector('[data-hal-app],[data-hal-admin]');
    if (!root) { S.root = null; return; }
    newPath();
    if (root.hasAttribute('data-hal-app')) {
      var ret = stReturn(); if (ret) { S.ret = ret; S.key = ''; }
      if (stDeep()) { S.deep = true; S.key = ''; }
      if (!S.pickPrinter) { try { S.pickPrinter = parseInt(sessionStorage.getItem('hal:st:printer') || '0', 10) || 0; } catch (e) {} }
    }
    var key = location.pathname + location.search;
    if (root === S.root && key === S.key) return;
    S.root = root; S.key = key;
    if (!root.__halBound) { root.__halBound = true; root.addEventListener('click', function (e) { var g = e.target.closest('[data-go]'); if (g && g.getAttribute('href')) { e.preventDefault(); go(g.getAttribute('href')); } }); }
    route();
  }
  window.__halApp = { tick: tick, v: V };
  tick();
  addEventListener('popstate', function () { setTimeout(tick, 40); });
  var wait = 0;
  try { new MutationObserver(function () { if (wait) return; wait = setTimeout(function () { wait = 0; var r = document.querySelector('[data-hal-app],[data-hal-admin]'); if (r !== S.root || location.pathname + location.search !== S.key) tick(); }, 120); }).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  /* 0.1.4 화면을 켜 둔 동안 1분마다 값만 다시 받아 옴 — 새로고침 없이 바뀜.
   *   화면이 보일 때만 · 떠 있는 창이 없을 때만 · 바뀐 것이 있을 때만 다시 그림 (깜빡임 · 스크롤 튐 없음). 다른 탭에 갔다 돌아오면 바로 한 번 */
  var liveBusy = false, liveAt = 0;
  /** 0.1.5 다시 받는 간격 (초) — 관리자 설정 (0 = 끔) */
  function liveSec() { var c = S.d && S.d.config, v = c && c.refresh_sec != null ? +c.refresh_sec : 60; return v > 0 ? Math.max(5, v) : 0; }
  function sig(d) { return JSON.stringify([d.devices.map(function (x) { return [x.id, x.temp, x.humidity, x.state, x.is_on, x.seen, x.stale, x.over, x.snap_at, x.hours_30d, x.name, x.where, x.humidity_max, x.temp_max, x.snap_public, x.sensors, x.target, x.location, x.printer_id, x.equipment_id]; }), d.smartthings, d.boxes, (d.printers || []).map(function (p) { return [p.id, p.state, p.live, p.via]; })]); }
  function live() {
    if (liveBusy || !S.root || !S.d || S.root.hasAttribute('data-hal-admin') || document.hidden || document.querySelector('.hal-modal') || !document.contains(S.root)) return;
    liveBusy = true; liveAt = Date.now();
    api('GET', '/me').then(function (r) { var old = sig(S.d); S.d = r.data; if (sig(r.data) !== old && !document.querySelector('.hal-modal')) { var y = window.scrollY; draw(); window.scrollTo(0, y); } else { qa('.hal-st').forEach(function (el, i) { var d = S.d.devices[i]; if (d && !d.never && !d.stale) el.innerHTML = '<span class="hal-dot on"></span>' + agoText(d.seen); }); } })
      .catch(function () {}).then(function () { liveBusy = false; });
  }
  setInterval(function () { var s = liveSec(); if (s && Date.now() - liveAt >= s * 1000 - 500) live(); }, 5000);   // 5초마다 「때가 됐나」만 봄 — 요청은 정한 간격에 한 번
  document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - liveAt > 4000) live(); });   // 1.7.20 「다시 받는 간격」을 꺼 두어도 돌아오면 한 번
  if (BC) BC.onmessage = function () { if (!document.hidden) { liveBusy = false; live(); } else liveAt = 0; };
})();
