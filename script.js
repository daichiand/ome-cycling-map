// 青梅法人会エリア
// サイクリング・観光マップ


// =========================
// 地図作成
// =========================

const map = L.map('map').setView(
    [35.7876, 139.2756],
    13
);


// =========================
// OpenStreetMap
// =========================

L.tileLayer(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution: '© OpenStreetMap contributors'
    }
).addTo(map);


// =========================
// 現在地表示・保存
// =========================

let currentLocation = null;

if (navigator.geolocation) {

    navigator.geolocation.getCurrentPosition(

        function(position) {

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // 現在地を保存
            currentLocation = {
                lat: lat,
                lng: lng
            };

            console.log(
                "現在地：",
                currentLocation
            );

            // 現在地を地図に表示
            L.marker([lat, lng])
                .addTo(map)
                .bindPopup("現在地");

        },

        function(error) {

            console.log(
                "現在地取得失敗",
                error
            );

        }

    );

}


// =========================
// マーカー管理
// =========================

let markers = [];
let allSpots = [];


// =========================
// サイクリングコース管理
// =========================

let courseLayers = {
    beginner: null,
    mitake: null
};


// =========================
// ルート管理
// =========================

let routeLayer = null;


// =========================
// Cloudflare API
// =========================

const ROUTE_API =
    "https://nyannyan.mikankinako04.workers.dev/";


// =========================
// JSON読み込み
// =========================

fetch("data/sightseeing.json")

.then(function(response) {

    return response.json();

})

.then(function(spots) {

    // 全観光データを保存
    allSpots = spots;

    // 最初はすべて表示
    displaySpots(spots);

})

.catch(function(error) {

    console.log(
        "データ読み込みエラー",
        error
    );

});


// =========================
// 観光スポット表示
// =========================

function displaySpots(spots) {

    // 現在のマーカーを削除
    markers.forEach(function(marker) {

        map.removeLayer(marker);

    });

    markers = [];


    // 新しいマーカーを表示
    spots.forEach(function(spot) {

        let marker = L.marker(
            [
                spot.lat,
                spot.lng
            ]
        )
        .addTo(map);


        marker.bindPopup(

            `
            <div class="spot-card">

                <h3>
                    ${spot.name}
                </h3>

                <p>
                    🌿 ${spot.category}
                </p>

                <p>
                    ${spot.description}
                </p>

                <hr>

                <p>
                    🚴 <b>サイクリング：</b><br>
                    ${spot.cycling}
                </p>

                <p>
                    📏 <b>距離：</b>
                    ${spot.distance}
                </p>

                <p>
                    ⏱ <b>時間：</b>
                    ${spot.time}
                </p>

                <p>
                    ⭐ <b>難易度：</b>
                    ${spot.difficulty}
                </p>

                <p>
                    🍂 <b>おすすめ季節：</b>
                    ${spot.season}
                </p>

                <p>
                    🚗 <b>駐車場：</b>
                    ${spot.parking}
                </p>

                <p>
                    🚻 <b>トイレ：</b>
                    ${spot.toilet}
                </p>

                <hr>

                <button
                    onclick="routeToSpot(${spot.lat}, ${spot.lng})"
                    style="
                        width: 100%;
                        padding: 10px;
                        font-size: 16px;
                        cursor: pointer;
                    "
                >
                    🚴 ここまでルート検索
                </button>

            </div>
            `

        );


        // マーカーを保存
        markers.push(marker);

    });

}


// =========================
// カテゴリーフィルター
// =========================

document
.querySelectorAll("#filter input")
.forEach(function(check) {

    check.addEventListener(
        "change",
        function() {

            // チェックされているカテゴリー
            let selected =
                Array.from(
                    document.querySelectorAll(
                        "#filter input:checked"
                    )
                )
                .map(function(c) {

                    return c.value;

                });


            // 選択されたカテゴリーだけ抽出
            let filtered =
                allSpots.filter(function(spot) {

                    return selected.includes(
                        spot.category
                    );

                });


            // 地図を更新
            displaySpots(filtered);

        }
    );

});


// =========================
// Cloudflare API
// 自転車ルート取得
// =========================

async function getCyclingRoute(
    startLat,
    startLng,
    endLat,
    endLng
) {

    try {

        const response = await fetch(
            ROUTE_API,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    coordinates: [

                        [
                            startLng,
                            startLat
                        ],

                        [
                            endLng,
                            endLat
                        ]

                    ]

                })

            }
        );


        if (!response.ok) {

            throw new Error(
                "ルート検索に失敗しました"
            );

        }


        const data =
            await response.json();


        console.log(
            "ルート取得成功",
            data
        );


        return data;


    } catch (error) {

        console.error(
            "ルート検索エラー",
            error
        );

        return null;

    }

}


// =========================
// 観光スポットまでのルート検索
// =========================

async function routeToSpot(
    endLat,
    endLng
) {

    // 現在地が取得できているか確認
    if (!currentLocation) {

        alert(
            "現在地を取得できていません。\n位置情報を許可してください。"
        );

        return;

    }


    // ルート検索開始
    const data =
        await getCyclingRoute(

            currentLocation.lat,
            currentLocation.lng,

            endLat,
            endLng

        );


    // 取得失敗
    if (!data) {

        alert(
            "ルートを取得できませんでした。"
        );

        return;

    }


    console.log(
        "取得したルート：",
        data
    );


    // 既存のルートを削除
    if (routeLayer) {

        map.removeLayer(
            routeLayer
        );

    }


    // GeoJSONとしてルートを表示
    routeLayer =
        L.geoJSON(
            data,
            {
                style: {
                    weight: 6
                }
            }
        ).addTo(map);


    // ルート全体が見えるようにする
    map.fitBounds(
        routeLayer.getBounds()
    );

}


// =========================
// サイクリングコースデータ
// =========================

const courses = {

    beginner: {

        name: "初心者コース",

        distance: "約15km",

        time: "約1時間30分",

        difficulty: "★☆☆☆☆",

        description:
            "青梅市街地から多摩川沿いを中心に走る、初心者でも楽しみやすいコースです。",

        spots: [
            "青梅駅",
            "釜の淵公園",
            "沢井",
            "御岳渓谷"
        ],

        points: [
            [35.7876, 139.2756],
            [35.7904, 139.2548],
            [35.8035, 139.1985],
            [35.8027, 139.1804]
        ]

    },


    mitake: {

        name: "御岳渓谷コース",

        distance: "約20km",

        time: "約2時間",

        difficulty: "★★☆☆☆",

        description:
            "多摩川沿いを走りながら御岳渓谷を目指す、自然を楽しめるコースです。",

        spots: [
            "青梅駅",
            "釜の淵公園",
            "沢井",
            "御嶽駅",
            "御岳渓谷"
        ],

        points: [
            [35.7876, 139.2756],
            [35.7904, 139.2548],
            [35.8035, 139.1985],
            [35.8020, 139.1830],
            [35.8027, 139.1804]
        ]

    }

};


// =========================
// コース表示
// =========================

function showCourse(course, courseId) {

    // すでに表示されていたら削除
    if (courseLayers[courseId]) {

        map.removeLayer(
            courseLayers[courseId]
        );

    }


    const line = L.polyline(
        course.points,
        {
            weight: 5
        }
    ).addTo(map);


    line.bindPopup(

        `
        <h3>
            🚴 ${course.name}
        </h3>

        <p>
            ${course.description}
        </p>

        <p>
            📏 距離：${course.distance}
        </p>

        <p>
            ⏱ 所要時間：${course.time}
        </p>

        <p>
            ⭐ 難易度：${course.difficulty}
        </p>
        `

    );


    // コースを保存
    courseLayers[courseId] = line;

}


// =========================
// コース削除
// =========================

function removeCourse(courseId) {

    if (courseLayers[courseId]) {

        map.removeLayer(
            courseLayers[courseId]
        );

        courseLayers[courseId] = null;

    }

}


// =========================
// コース詳細表示
// =========================

function showCourseInfo(course) {

    const info =
        document.querySelector(
            "#course-info"
        );


    info.innerHTML = `

        <div class="course-card">

            <h3>
                🚴 ${course.name}
            </h3>

            <p>
                📏 <b>距離：</b>
                ${course.distance}
            </p>

            <p>
                ⏱ <b>所要時間：</b>
                ${course.time}
            </p>

            <p>
                ⭐ <b>難易度：</b>
                ${course.difficulty}
            </p>

            <p>
                ${course.description}
            </p>

            <hr>

            <h4>
                📍 経由地
            </h4>

            <ul>

                ${course.spots.map(
                    function(spot) {

                        return `
                            <li>
                                ${spot}
                            </li>
                        `;

                    }
                ).join("")}

            </ul>

        </div>

    `;

}


// =========================
// 初心者コース
// =========================

document
.querySelector("#course-beginner")
.addEventListener(
    "change",
    function() {

        if (this.checked) {

            showCourse(
                courses.beginner,
                "beginner"
            );

            showCourseInfo(
                courses.beginner
            );

        } else {

            removeCourse(
                "beginner"
            );


            const mitakeCheckbox =
                document.querySelector(
                    "#course-mitake"
                );


            if (mitakeCheckbox.checked) {

                showCourseInfo(
                    courses.mitake
                );

            } else {

                document.querySelector(
                    "#course-info"
                ).innerHTML = "";

            }

        }

    }
);


// =========================
// 御岳渓谷コース
// =========================

document
.querySelector("#course-mitake")
.addEventListener(
    "change",
    function() {

        if (this.checked) {

            showCourse(
                courses.mitake,
                "mitake"
            );

            showCourseInfo(
                courses.mitake
            );

        } else {

            removeCourse(
                "mitake"
            );


            const beginnerCheckbox =
                document.querySelector(
                    "#course-beginner"
                );


            if (beginnerCheckbox.checked) {

                showCourseInfo(
                    courses.beginner
                );

            } else {

                document.querySelector(
                    "#course-info"
                ).innerHTML = "";

            }

        }

    }
);