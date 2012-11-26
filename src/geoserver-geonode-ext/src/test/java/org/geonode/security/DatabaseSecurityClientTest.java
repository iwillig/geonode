package org.geonode.security;

import java.sql.SQLException;
import javax.sql.DataSource;
import junit.framework.TestCase;
import org.apache.commons.dbcp.BasicDataSource;

/**
 * @todo integration tests...
 * @author Ian Schneider <ischneider@opengeo.org>
 */
public class DatabaseSecurityClientTest extends TestCase {

    public void testSomeMethod() throws SQLException {
        DataSource dataSource = createDataSource1();
        try {
            dataSource.getConnection().close();
        } catch (SQLException sqle) {
            System.err.println("Not running database security client test");
            if (false) {
                sqle.printStackTrace();
            }
            return;
        }

        DatabaseSecurityClient dsc = new DatabaseSecurityClient(dataSource, "", null);
            
        long time = System.currentTimeMillis();
        for (int i = 0; i < 1000; i++) {
            String authorize = dsc.authorize("ian", "geonode:conflicts");
        }
        System.out.println(System.currentTimeMillis() - time);
    }

    static DataSource createDataSource1() {
        BasicDataSource dataSource = new BasicDataSource();

        String host = "localhost";
        String port = "5432";
        String db = "geonode";
        String user = "geonode";
        String password = "";
        String uri = "jdbc:postgresql" + "://" + host + ":" + port + "/" + db + "?user=" + user + "&password=" + password;
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setUrl(uri);
        return dataSource;
    }
}
