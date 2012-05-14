import math

MJD0 = 2400000.5 # 1858 November 17, 00:00:00 hours

def base60_to_decimal(xyz,delimiter=None):
    """Decimal value from numbers in sexagesimal system.

    The input value can be either a floating point number or a string
    such as "hh mm ss.ss" or "dd mm ss.ss". Delimiters other than " "
    can be specified using the keyword ``delimiter``.
    """

    divisors = [1,60.0,3600.0]
    xyzlist = str(xyz).split(delimiter)
    sign = -1 if xyzlist[0].find("-") != -1 else 1

    xyzlist = [abs(float(x)) for x in xyzlist]
    decimal_value = 0

    for i,j in zip(xyzlist,divisors): # if xyzlist has <3 values then
                                    # divisors gets clipped.
        decimal_value += i/j

    decimal_value = -decimal_value if sign == -1 else decimal_value
    return decimal_value

def julian_date(year,month,day,hour=0,minute=0,second=0):
    """Given year, month, day, hour, minute and second return JD.

    ``year``, ``month``, ``day``, ``hour`` and ``minute`` are integers,
    truncates fractional part; ``second`` is a floating point number.
    For BC year: use -(year-1). Example: 1 BC = 0, 1000 BC = -999.
    """
    MJD0 = 2400000.5 # 1858 November 17, 00:00:00 hours

    year, month, day, hour, minute =\
    int(year),int(month),int(day),int(hour),int(minute)

    if month <= 2:
        month +=12

        year -= 1

    modf = math.modf
    # Julian calendar on or before 1582 October 4 and Gregorian calendar
    # afterwards.

    if ((10000L*year+100L*month+day) <= 15821004L):
        b = -2 + int(modf((year+4716)/4)[1]) - 1179 
    else:
        b = int(modf(year/400)[1])-int(modf(year/100)[1])+\
            int(modf(year/4)[1]) 

    mjdmidnight = 365L*year - 679004L + b + int(30.6001*(month+1)) + day

    fracofday = base60_to_decimal(\
        " ".join([str(hour),str(minute),str(second)])) / 24.0

    return MJD0 + mjdmidnight + fracofday

def iso_str_to_jdate(iso_str):
    ymd = iso_str.split('T')[0]
    neg = 1
    if ymd[0] == '-':
        ymd = ymd[1:]
        neg = -1
    args = map(int,ymd.split('-'))
    args[0] *= neg
    return int(julian_date(*args))

def test():
    print int(julian_date(-1000000000,1,1))
    print iso_str_to_jdate('-5000-01-01T12:00:00Z')

if __name__ == '__main__':
    test()