async function guardarVentasFirebase(datos) {
    try {
        await db.collection("ventas").add({
            fechaRegistro: new Date(),
            datos: datos
        });

        console.log("Ventas guardadas en Firebase");
    } catch (error) {
        console.error("Error al guardar:", error);
    }
}