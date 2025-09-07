import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api";
import "../../styles/AdminUsers.css";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const usersRes = await API.get("/users");
      setUsers(usersRes.data);
    };
    fetchData();
  }, []);

  return (
    <div className="admin-users-container">
      <h2>Benutzerverwaltung</h2>

      <div className="table-wrapper">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>Benutzername</th>
              <th>Name</th>
              <th>Rolle</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.username}</td>
                <td>{u.realname}</td>
                <td>{u.role}</td>
                <td>
                  <Link to={`/admin/users/${u._id}`}>Bearbeiten</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
