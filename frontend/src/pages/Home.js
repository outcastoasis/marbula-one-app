// src/pages/Home.js
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import API from "../api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../index.css";

export default function Home() {
  const { user } = useContext(AuthContext);
  const [season, setSeason] = useState(null);
  const [races, setRaces] = useState([]);
  const [persons, setPersons] = useState([]);
  const [cumulativeData, setCumulativeData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const seasonRes = await API.get("/seasons/latest");
    setSeason(seasonRes.data);

    const racesRes = await API.get("/races/bySeason/" + seasonRes.data._id);
    setRaces(racesRes.data);

    const personsRes = await API.get("/users/season/" + seasonRes.data._id);
    setPersons(personsRes.data);

    buildCumulativeGraph(racesRes.data, personsRes.data);
  };

  const buildCumulativeGraph = (races, persons) => {
    const cumulativePoints = {};
    persons.forEach((p) => (cumulativePoints[p._id] = 0));

    const chartData = races.map((race) => {
      race.results.forEach((result) => {
        if (result.personId?._id) {
          cumulativePoints[result.personId._id] += result.points;
        }
      });

      const entry = { name: race.name };
      persons.forEach((p) => {
        entry[p.name] = cumulativePoints[p._id];
      });

      return entry;
    });

    setCumulativeData(chartData);
  };

  const generateColor = (index, total) => {
    const hue = (index * (360 / total)) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <div className="container">
      <h1>Willkommen, {user?.username}</h1>
      <section>
        <h2>Punkteverlauf</h2>
        <div className="chart-scroll">
          <div className="chart-inner">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {persons.map((p, i) => (
                  <Line
                    key={p._id}
                    type="monotone"
                    dataKey={p.name}
                    stroke={generateColor(i, persons.length)}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
