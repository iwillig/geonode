package org.geonode.security;

import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.dbcp.BasicDataSource;
import org.geoserver.platform.GeoServerExtensions;
import org.geotools.util.logging.Logging;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;

/**
 *
 * @author Ian Schneider <ischneider@opengeo.org>
 */
public class GeoNodeSecurityClientProvider implements ApplicationContextAware {

    final Logger LOGGER = Logging.getLogger(DefaultSecurityClient.class);
    GeonodeSecurityClient client;
    final HTTPClient httpClient;
    
    public GeoNodeSecurityClientProvider(HTTPClient httpClient) {
        this.httpClient = httpClient;
    }

    public GeonodeSecurityClient getSecurityClient() {
        return client;
    }

    /**
     * Looks up for the {@code GEONODE_BASE_URL} property (either a System
     * property, a servlet context parameter or an environment variable) to be
     * used as the base URL for the GeoNode authentication requests (for which
     * {@code 'data/acls'} will be appended). <p> If not provided, defaults to
     * {@code http://localhost:8000} </p>
     *
     * @see
     * org.springframework.context.ApplicationContextAware#setApplicationContext(org.springframework.context.ApplicationContext)
     * @see GeoServerExtensions#getProperty(String, ApplicationContext)
     */
    public void setApplicationContext(ApplicationContext ac) throws BeansException {
        String securityClientDatabaseURL = GeoServerExtensions.getProperty("org.geonode.security.databaseSecurityClient.url");

        String securityClient = "default";
        if (securityClientDatabaseURL == null) {
            DefaultSecurityClient defaultClient = new DefaultSecurityClient(httpClient);
            defaultClient.setApplicationContext(ac);
            client = defaultClient;
        } else {
            securityClient = "database";
            BasicDataSource dataSource = new BasicDataSource();
            dataSource.setDriverClassName("org.postgresql.Driver");
            dataSource.setUrl(securityClientDatabaseURL);
            String baseUrl = DefaultSecurityClient.getBaseUrl(ac);
            client = new DatabaseSecurityClient(dataSource, baseUrl, httpClient);
        }
        LOGGER.log(Level.INFO, "using geonode {0} security client", securityClient);

    }
}
