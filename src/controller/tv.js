import dbWrapper from '../utils/dbWrapper.js';

const getCharts = async (req, res) => {
    const { client, user, chart } = req.query;

    try {
        if (chart) {
            // Load specific chart
            const chartData = await dbWrapper.getChartLayoutById(chart);
            if (chartData) {
                res.setHeader('Cache-Control', 'no-store');
                return res.json({
                    status: "ok",
                    data: JSON.parse(chartData.content)
                });
            } else {
                return res.json({ status: "error", message: "Chart not found" });
            }
        } else {
            // List charts
            const charts = await dbWrapper.getChartLayouts(user, client);
            res.setHeader('Cache-Control', 'no-store');
            return res.json({
                status: "ok",
                data: charts.map(c => ({
                    id: c.id,
                    name: c.name,
                    timestamp: parseInt(c.timestamp),
                    resolution: c.resolution,
                    symbol: c.symbol
                }))
            });
        }
    } catch (error) {
        console.error("Error in getCharts:", error);
        return res.json({ status: "error", message: error.message });
    }
};

const saveChart = async (req, res) => {
    try {
        const { name, content, symbol, resolution } = req.body;
        const { client, user } = req.query;
        // TV sends content as a JSON string sometimes, or object.
        // We store it as string.
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

        const data = {
            name,
            content: contentStr,
            symbol,
            resolution,
            timestamp: Math.floor(Date.now() / 1000),
            client_id: client,
            user_id: user
        };

        const savedChart = await dbWrapper.saveChartLayout(data);
        return res.json({ status: "ok", id: savedChart.id });
    } catch (error) {
        console.error("Error in saveChart:", error);
        return res.json({ status: "error", message: error.message });
    }
};

const deleteChart = async (req, res) => {
    const { client, user, chart } = req.query;
    try {
        await dbWrapper.deleteChartLayout(chart);
        return res.json({ status: "ok" });
    } catch (error) {
        console.error("Error in deleteChart:", error);
        return res.json({ status: "error", message: error.message });
    }
};

export default { getCharts, saveChart, deleteChart };
