// 青梅法人会エリア
// サイクリング・観光マップ

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
            .bindPopup("現在地")
            .openPopup();


        },

        function(){

            console.log(
                "現在地取得失敗"
            );

        }

    );

}



// JSONから観光データ読み込み

fetch("data/sightseeing.json")

.then(function(response){

    return response.json();

})


.then(function(spots){


    spots.forEach(function(spot){


        L.marker(
            [
                spot.lat,
                spot.lng
            ]
        )

        .addTo(map)

        .bindPopup(

        `
        <h3>${spot.name}</h3>

        <p>
        <b>カテゴリー：</b>
        ${spot.category}
        </p>

        <p>
        ${spot.description}
        </p>

        <p>
        🚴 ${spot.cycling}
        </p>

        `

        );


    });


})


.catch(function(error){

    console.log(
        "データ読み込みエラー",
        error
    );

});