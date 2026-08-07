// 青梅法人会エリア サイクリング・観光マップ

// 地図作成
const map = L.map('map').setView(
    [35.7876, 139.2756],
    13
);


// OpenStreetMap表示
L.tileLayer(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution:
        '&copy; OpenStreetMap contributors'
    }
).addTo(map);


// 現在地表示
if (navigator.geolocation) {

    navigator.geolocation.getCurrentPosition(

        function(position){

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;


            L.marker([lat,lng])
            .addTo(map)
            .bindPopup(
                "現在地"
            )
            .openPopup();


            map.setView(
                [lat,lng],
                14
            );

        },

        function(){

            console.log(
                "現在地を取得できませんでした"
            );

        }

    );

}


// 仮の観光スポットデータ

const spots = [

{
    name:"御岳渓谷",
    lat:35.8027,
    lng:139.1804,
    text:"多摩川沿いの美しい渓谷。サイクリングにもおすすめです。"
},

{
    name:"釜の淵公園",
    lat:35.7904,
    lng:139.2548,
    text:"川沿いで休憩できる青梅の自然スポットです。"
},

{
    name:"青梅駅",
    lat:35.7876,
    lng:139.2756,
    text:"青梅観光のスタート地点です。"
}

];


// マーカー表示

spots.forEach(function(spot){

    L.marker(
        [spot.lat,spot.lng]
    )
    .addTo(map)
    .bindPopup(
        `
        <h3>${spot.name}</h3>
        <p>${spot.text}</p>
        `
    );

});