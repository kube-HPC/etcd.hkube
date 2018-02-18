class JsonHelper {

    tryParseJSON(json) {
        let parsed = json;
        try {
            parsed = JSON.parse(json);
        }
        catch (e) {
            console.error(e);
        }
        return parsed;
    }
}

module.exports = new JsonHelper();
